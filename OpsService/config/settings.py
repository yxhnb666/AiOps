import os
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")
# JWT 配置 - 必须与 Django UserService 的 SIMPLE_JWT SIGNING_KEY 一致
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "django-insecure-dev-key-change-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

# 数据库配置
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://ops_user:ops_password_2026@localhost:5432/myaiops")

# Redis 配置 - 用于 LangGraph Checkpoint 和会话历史
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# 加密密钥 - 用于加密存储服务器密码
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", "change-this-to-a-32-byte-key-in-production")

# ==================== RAG 知识库 ====================
# 上传文件的本地保存目录（按日期分子目录）
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", Path(__file__).resolve().parent.parent / "uploads")).resolve()

# Chroma 向量库本地持久化路径（嵌入式，无需起服务）
CHROMA_PERSIST_DIR = Path(os.getenv("CHROMA_PERSIST_DIR", Path(__file__).resolve().parent.parent / "chroma_db")).resolve()
CHROMA_COLLECTION = os.getenv("CHROMA_COLLECTION", "ops_knowledge")
# 默认检索 top-k
RAG_TOP_K = int(os.getenv("RAG_TOP_K", "5"))
# 默认 chunk_size / chunk_overlap
RAG_CHUNK_SIZE = int(os.getenv("RAG_CHUNK_SIZE", "512"))
RAG_CHUNK_OVERLAP = int(os.getenv("RAG_CHUNK_OVERLAP", "80"))
# 允许的上传后缀
ALLOWED_UPLOAD_EXT = {".pdf", ".md", ".txt", ".log", ".markdown"}

# ==================== Embedding 模型（与对话模型解耦）====================

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-v4")
# OpenAI 兼容端点。通义千问：https://dashscope.aliyuncs.com/compatible-mode/v1
EMBEDDING_BASE_URL = os.getenv("EMBEDDING_BASE_URL", "")
DASHSCOPE_API_KEY = os.getenv("DASHSCOPE_API_KEY", "")
# 仅当用 OpenAI 的 text-embedding-3-* 系列时才需要 provider=openai 以启用 dimensions 参数
EMBEDDING_PROVIDER = os.getenv("EMBEDDING_PROVIDER", "alibaba_dashscope")