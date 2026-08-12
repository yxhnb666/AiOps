from sqlalchemy import String, Boolean, Float, DateTime, func, Integer
from sqlalchemy.orm import Mapped, mapped_column
from config.database import Base


class ModelConfig(Base):
    __tablename__ = "model_configs"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    provider: Mapped[str] = mapped_column(String(32), nullable=False)  # openai / deepseek / anthropic / gemini
    model_name: Mapped[str] = mapped_column(String(128), nullable=False)
    embedding_model: Mapped[str | None] = mapped_column(String(128))
    embedding_dimensions: Mapped[int | None] = mapped_column(Integer)
    api_key: Mapped[str] = mapped_column(String(512), nullable=False)  # 加密存储
    base_url: Mapped[str | None] = mapped_column(String(256), nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    temperature: Mapped[float] = mapped_column(Float, default=0.7)
    created_at = mapped_column(DateTime, server_default=func.now())
    updated_at = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())