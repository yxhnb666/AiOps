from datetime import datetime
from sqlalchemy import String, Integer, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from config.database import Base


class KnowledgeDoc(Base):
    """知识库文档元数据表。

    chunk 内容不入 SQL，只存向量库（Chroma），避免双写不一致。
    SQL 只存文档级元数据 + 向量化状态。
    """
    __tablename__ = "knowledge_docs"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(256))
    doc_type: Mapped[str] = mapped_column(String(32))  # manual / case / sop / log
    source: Mapped[str | None] = mapped_column(String(256))  # 文件名或来源标识
    file_path: Mapped[str | None] = mapped_column(String(512))  # 原文件存储路径
    content_hash: Mapped[str] = mapped_column(String(64), unique=True)  # 内容去重
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(16), default="pending")  # pending/ready/failed
    tags: Mapped[str | None] = mapped_column(String(256))  # 逗号分隔标签
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )