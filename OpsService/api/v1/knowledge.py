from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from config.database import get_db
from core.auth import get_current_user
from schemas.knowledge import (
    KnowledgeDocOut,
    KnowledgeSearchHit,
    KnowledgeSearchRequest,
)
from services.knowledge import (
    list_docs,
    get_doc,
    upload_doc,
    delete_doc,
    search as knowledge_search,
)
from rag.retriever import RetrievedChunk

router = APIRouter(prefix="/api/v1/knowledge", tags=["知识库"])

# 允许的文档类型
ALLOWED_DOC_TYPES = {"manual", "case", "sop", "log"}


def _validate_doc_type(doc_type: str) -> None:
    if doc_type not in ALLOWED_DOC_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"doc_type 必须是 {sorted(ALLOWED_DOC_TYPES)} 之一",
        )


@router.get("/docs", response_model=list[KnowledgeDocOut])
async def list_documents(
    doc_type: str | None = Query(None, description="按类型过滤：manual/case/sop/log"),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    return await list_docs(db, doc_type=doc_type)


@router.get("/docs/{doc_id}", response_model=KnowledgeDocOut)
async def get_document(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    return await get_doc(db, doc_id)


@router.post(
    "/upload",
    response_model=KnowledgeDocOut,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    file: UploadFile = File(..., description="PDF/Markdown/Txt/Log 文件"),
    title: str = Form(..., description="文档标题"),
    doc_type: str = Form(..., description="文档类型：manual/case/sop/log"),
    tags: str | None = Form(None, description="标签，逗号分隔"),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """上传文档并自动入库向量化。

    - 文件类型：.pdf / .md / .markdown / .txt / .log
    - 同内容（hash 命中）会直接返回已有记录，不重复入库
    """
    _validate_doc_type(doc_type)
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="文件为空")
    return await upload_doc(
        db=db,
        title=title,
        doc_type=doc_type,
        source=file.filename or "unknown",
        file_bytes=file_bytes,
        original_filename=file.filename or "upload.txt",
        tags=tags,
    )


@router.delete("/docs/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    await delete_doc(db, doc_id)


@router.post("/search", response_model=list[KnowledgeSearchHit])
async def search_documents(
    req: KnowledgeSearchRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """检索测试：给定 query 返回 top-k 命中的 chunk（含来源元数据）。"""
    if req.doc_type:
        _validate_doc_type(req.doc_type)
    hits: list[RetrievedChunk] = await knowledge_search(
        db=db,
        query=req.query,
        doc_type=req.doc_type,
        top_k=req.top_k,
    )
    return [
        KnowledgeSearchHit(
            doc_id=h.doc_id,
            doc_type=h.doc_type,
            title=h.title,
            source=h.source,
            tags=h.tags,
            chunk_index=h.chunk_index,
            page=h.page,
            content=h.content,
            score=h.score,
        )
        for h in hits
    ]
