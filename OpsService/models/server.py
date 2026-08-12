from sqlalchemy import String, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from config.database import Base


class ServerGroup(Base):
    __tablename__ = "server_groups"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(256), nullable=True)
    color: Mapped[str | None] = mapped_column(String(7), nullable=True)
    created_at = mapped_column(DateTime, server_default=func.now())
    updated_at = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    servers: Mapped[list["Server"]] = relationship(back_populates="group")


class Server(Base):
    __tablename__ = "servers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    hostname: Mapped[str] = mapped_column(String(128), nullable=False)
    ip: Mapped[str] = mapped_column(String(45), nullable=False)
    port: Mapped[int] = mapped_column(default=22)
    os: Mapped[str | None] = mapped_column(String(32), nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="offline")
    username: Mapped[str] = mapped_column(String(64), nullable=False)
    auth_type: Mapped[str] = mapped_column(String(16), default="password")  # password / key
    password: Mapped[str | None] = mapped_column(String(512), nullable=True)  # 加密存储
    key_path: Mapped[str | None] = mapped_column(String(256), nullable=True)
    tags: Mapped[str | None] = mapped_column(String(256), nullable=True)
    group_id: Mapped[int | None] = mapped_column(ForeignKey("server_groups.id"), nullable=True)
    created_at = mapped_column(DateTime, server_default=func.now())
    updated_at = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    group: Mapped[ServerGroup | None] = relationship(back_populates="servers")