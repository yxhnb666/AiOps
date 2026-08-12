from __future__ import annotations
import chromadb
from chromadb.config import Settings
from langchain_chroma import Chroma
from config.settings import CHROMA_PERSIST_DIR, CHROMA_COLLECTION, RAG_TOP_K
from core.embedding import get_embeddings
from rag.chunker import Chunk
from utils.logger_handler import get_logger

logger = get_logger("vectorstore")

_client: chromadb.PersistentClient | None = None
_langchain_store: Chroma | None = None


def _get_client() -> chromadb.PersistentClient:
    global _client
    if _client is None:
        CHROMA_PERSIST_DIR.mkdir(parents=True, exist_ok=True)
        _client = chromadb.PersistentClient(
            path=str(CHROMA_PERSIST_DIR),
            settings=Settings(anonymized_telemetry=False),
        )
    return _client

def get_vectorstore() -> Chroma:
    """返回 LangChain Chroma 向量库实例（单例）。"""
    # if embeddings_config is None:
    #     db = await get_db()
    #     embeddings_config = await get_default_model_config(db)
    # logger.info(f"获取向量库:embeddings_config的值为{embeddings_config}")
    global _langchain_store
    if _langchain_store is None:
        _langchain_store = Chroma(
            client=_get_client(),
            collection_name=CHROMA_COLLECTION,
            embedding_function=get_embeddings(),
            collection_metadata={"hnsw:space": "cosine"}
        )
    return _langchain_store


def reset_vectorstore_for_test() -> None:
    """单元测试用：重置全局单例（不要在生产调用）。"""
    global _client, _langchain_store
    _client = None
    _langchain_store = None


async def add_chunks(
    doc_id: int,
    doc_type: str,
    title: str,
    source: str | None,
    tags: str | None,
    chunks: list[Chunk]
) -> list[str]:
    """把分块写入向量库，返回生成的 chunk_id 列表。

    metadata 保留 doc_id / doc_type / title / source / tags / chunk_index / page，
    支持后续按类型过滤和溯源。
    """
    if not chunks:
        return []
    store = get_vectorstore()
    ids = [f"doc{doc_id}_chunk{c.index}" for c in chunks] 
    metadatas = [
        {
            "doc_id": doc_id,
            "doc_type": doc_type,
            "title": title,
            "source": source or "",
            "tags": tags or "",
            "chunk_index": c.index,
            "page": c.page or 0,
        }
        for c in chunks
    ]
    texts = [c.content for c in chunks]
    await store.aadd_texts(texts=texts, metadatas=metadatas, ids=ids)
    return ids


async def delete_by_doc_ids(doc_ids: list[int]) -> None:
    """按文档 id 删除其下所有 chunk。"""
    if not doc_ids:
        return
    store = get_vectorstore()
    # 用 where 子句拿到匹配 chunk 的 id，再批量 delete
    collection = store._collection
    where = {"doc_id": {"$in": doc_ids}}
    try:
        results = collection.get(where=where, include=[])
        existing_ids = results.get("ids", [])
    except Exception:
        existing_ids = []
    if existing_ids:
        collection.delete(ids=existing_ids)


async def reindex_doc(
    doc_id: int,
    doc_type: str,
    title: str,
    source: str | None,
    tags: str | None,
    chunks: list[Chunk],
) -> list[str]:
    """重新向量化：先删再写。"""
    await delete_by_doc_ids([doc_id])
    return await add_chunks(doc_id, doc_type, title, source, tags, chunks)
