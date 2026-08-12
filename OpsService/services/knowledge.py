from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.knowledge import KnowledgeDoc
from models.model_config import ModelConfig
from services.model_config import get_default_model_config
from rag.ingest import ingest_document, delete_document
from rag.retriever import search as rag_search, format_for_prompt
from rag.retriever import RetrievedChunk
from config.settings import RAG_TOP_K


async def list_docs(
    db: AsyncSession,
    doc_type: str | None = None,
) -> list[KnowledgeDoc]:
    """文档列表，支持按 doc_type 过滤。"""
    stmt = select(KnowledgeDoc).order_by(KnowledgeDoc.created_at.desc())
    if doc_type:
        stmt = stmt.where(KnowledgeDoc.doc_type == doc_type)
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_doc(db: AsyncSession, doc_id: int) -> KnowledgeDoc:
    doc = await db.get(KnowledgeDoc, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")
    return doc


async def upload_doc(
    db: AsyncSession,
    title: str,
    doc_type: str,
    source: str,
    file_bytes: bytes,
    original_filename: str,
    tags: str | None = None,
) -> KnowledgeDoc:
    """上传并入库文档。"""
    try:
        return await ingest_document(
            db=db,
            title=title,
            doc_type=doc_type,
            source=source,
            file_bytes=file_bytes,
            original_filename=original_filename,
            tags=tags,
        )
    except ValueError as e:
        # 文件类型不允许
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        # 向量化失败
        raise HTTPException(status_code=500, detail=str(e))


async def delete_doc(db: AsyncSession, doc_id: int) -> None:
    doc = await get_doc(db, doc_id)
    await delete_document(db, doc)


async def search(
    db: AsyncSession,
    query: str,
    doc_type: str | None = None,
    top_k: int | None = None,
) -> list[RetrievedChunk]:
    """检索测试：返回结构化的命中结果。"""
    return await rag_search(
        query=query,
        doc_type=doc_type,
        top_k=top_k or RAG_TOP_K,
    )
