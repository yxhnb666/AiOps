from pydantic import BaseModel
from datetime import datetime


class KnowledgeDocOut(BaseModel):
    """文档列表/详情响应。"""
    id: int
    title: str
    doc_type: str
    source: str | None
    file_path: str | None
    content_hash: str
    chunk_count: int
    status: str  # pending / processing / ready / failed
    tags: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class KnowledgeSearchHit(BaseModel):
    """单条检索命中结果。"""
    doc_id: int
    doc_type: str
    title: str
    source: str
    tags: str
    chunk_index: int
    page: int | None
    content: str
    score: float


class KnowledgeSearchRequest(BaseModel):
    """检索测试接口请求体。"""
    query: str
    doc_type: str | None = None
    top_k: int | None = None
