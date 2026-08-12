from __future__ import annotations
import hashlib
import shutil
import aiofiles
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from config.settings import UPLOAD_DIR, ALLOWED_UPLOAD_EXT
from models.knowledge import KnowledgeDoc
from rag.chunker import chunk_file
from rag.vectorstore import add_chunks, delete_by_doc_ids


def compute_content_hash(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _safe_save_path(content_hash: str, original_suffix: str) -> Path:
    """用 content_hash + 后缀做文件名，自然去重。"""
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    return UPLOAD_DIR / f"{content_hash[:16]}{original_suffix.lower()}"


async def save_upload_file(original_filename: str, file_bytes: bytes) -> tuple[Path, str]:
    """保存上传文件到 UPLOAD_DIR，返回（落盘路径，content_hash）。"""
    suffix = Path(original_filename).suffix.lower()
    if suffix not in ALLOWED_UPLOAD_EXT:
        raise ValueError(f"不支持的文件类型：{suffix}，允许：{sorted(ALLOWED_UPLOAD_EXT)}")
    content_hash = compute_content_hash(file_bytes)
    save_path = _safe_save_path(content_hash, suffix)
    if not save_path.exists():
        async with aiofiles.open(str(save_path), "wb") as f:
            await f.write(file_bytes)
    return save_path, content_hash


async def ingest_document(
    db: AsyncSession,
    title: str,
    doc_type: str,
    source: str,
    file_bytes: bytes,
    original_filename: str,
    tags: str | None = None,
) -> KnowledgeDoc:
    """完整入库流水线：保存文件 → 分块 → 写 PG 元数据 → 写 Chroma。

    如果 content_hash 已存在，直接复用原记录（不重复入库），刷新为 ready。
    """
    content_hash = compute_content_hash(file_bytes)

    # 1) 查重
    from sqlalchemy import select
    stmt = select(KnowledgeDoc).where(KnowledgeDoc.content_hash == content_hash)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing is not None:
        return existing  # 已入库，直接返回

    # 2) 存文件
    save_path, _ = await save_upload_file(original_filename, file_bytes)

    # 3) 先插 PG（拿到 id 给 Chroma 当 metadata 用）
    doc = KnowledgeDoc(
        title=title,
        doc_type=doc_type,
        source=source,
        file_path=str(save_path),
        content_hash=content_hash,
        status="processing",
        tags=tags,
        chunk_count=0,
    )
    db.add(doc)
    await db.flush()  # 拿到 doc.id

    try:
        # 4) 分块 + 写向量库
        suffix = Path(original_filename).suffix.lower()
        chunks = chunk_file(save_path, suffix)
        chunk_ids = await add_chunks(
            doc_id=doc.id,
            doc_type=doc_type,
            title=title,
            source=source,
            tags=tags,
            chunks=chunks
        )
        # 5) 更新 PG 状态
        doc.chunk_count = len(chunk_ids)
        doc.status = "ready" if chunk_ids else "failed"
    except Exception as e:
        doc.status = "failed"
        await db.commit()
        # 失败时清理可能残留的向量数据
        try:
            await delete_by_doc_ids([doc.id])
        except Exception:
            pass
        raise RuntimeError(f"向量化失败：{e}") from e

    await db.commit()
    await db.refresh(doc)
    return doc


async def delete_document(db: AsyncSession, doc: KnowledgeDoc) -> None:
    """删除：先删 Chroma chunk，再删 PG 行，本地文件保留（供排错）。"""
    await delete_by_doc_ids([doc.id])
    await db.delete(doc)
    await db.commit()
    # 本地文件可以保留；如果想真删，取消下面注释
    # if doc.file_path and Path(doc.file_path).exists():
    #     Path(doc.file_path).unlink(missing_ok=True)


def purge_deleted_files() -> None:
    """清理 UPLOAD_DIR 里 PG 已删除但文件残留的垃圾（可选运维脚本）。"""
    from sqlalchemy import select as _select
    from config.database import async_session
    import asyncio

    async def _worker():
        existing_paths: set[str] = set()
        async with async_session() as s:
            rows = (await s.execute(_select(KnowledgeDoc.file_path))).all()
            existing_paths = {r[0] for r in rows if r[0]}
        for f in UPLOAD_DIR.rglob("*"):
            if f.is_file() and str(f) not in existing_paths:
                f.unlink(missing_ok=True)

    asyncio.run(_worker())