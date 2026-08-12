from langchain_community.embeddings import DashScopeEmbeddings
from utils.logger_handler import get_logger
from config.settings import EMBEDDING_MODEL, EMBEDDING_BASE_URL, DASHSCOPE_API_KEY

logger = get_logger("embedding")

def get_embeddings() -> DashScopeEmbeddings:
    kwargs = {
        "model": EMBEDDING_MODEL,
        "dashscope_api_key": DASHSCOPE_API_KEY,
    }

    return DashScopeEmbeddings(**kwargs)


def _default_embedding_model(provider: str) -> str:
    match provider:
        case "alibaba_dashscope":
            return "text-embedding-v4"
        case "openai":
            return "text-embedding-3-small"
        case _:
            # DeepSeek 暂无 embedding 模型，兜底用 text-embedding-3-small（需有 openai key）
            return "text-embedding-3-small"


def _default_dimensions(model_name: str) -> int:
    match model_name:
        case "text-embedding-v4":
            return 256
        case "text-embedding-v3":
            return 1024
        case "text-embedding-3-small":
            return 1536
        case "text-embedding-3-large":
            return 3072
        case _:
            return 1024
