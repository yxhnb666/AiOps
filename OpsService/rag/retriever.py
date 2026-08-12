from __future__ import annotations
from dataclasses import dataclass, asdict
from config.settings import RAG_TOP_K
from rag.vectorstore import get_vectorstore


@dataclass
class RetrievedChunk:
    """返回给上层（前端/Agent）的单条检索结果。"""
    doc_id: int
    doc_type: str
    title: str
    source: str
    tags: str
    chunk_index: int
    page: int | None
    content: str
    score: float  # 距离，越小越相似（Chroma 默认 l2）


async def search(
    query: str,
    doc_type: str | None = None,
    top_k: int = RAG_TOP_K,
    doc_ids: list[int] | None = None,
) -> list[RetrievedChunk]:
    """向量相似度检索。

    - doc_type: manual / case / sop / log，传空不过滤
    - doc_ids:  限定部分文档，传空全库检索
    返回按相似度升序（越靠前越相关）。
    """
    store = get_vectorstore()
    filter_dict: dict = {}
    if doc_type:
        filter_dict["doc_type"] = doc_type
    if doc_ids:
        filter_dict["doc_id"] = {"$in": doc_ids}

    results = await store.asimilarity_search_with_score(
        query, k=top_k, filter=filter_dict or None
    )
    out: list[RetrievedChunk] = []
    for doc, score in results:
        md = doc.metadata
        out.append(
            RetrievedChunk(
                doc_id=int(md.get("doc_id", 0)),
                doc_type=str(md.get("doc_type", "")),
                title=str(md.get("title", "")),
                source=str(md.get("source", "")),
                tags=str(md.get("tags", "")),
                chunk_index=int(md.get("chunk_index", 0)),
                page=int(p) if (p := md.get("page") or 0) else None,
                content=doc.page_content,
                score=float(score),
            )
        )
    return out


def format_for_prompt(chunks: list[RetrievedChunk]) -> str:
    """把检索结果拼接到 Agent 的 prompt 里。"""
    if not chunks:
        return ""
    lines = []
    for i, c in enumerate(chunks, 1):
        lines.append(
            f"[{i}] 来源：{c.title}（{c.doc_type}），文档ID={c.doc_id}, 分块#{c.chunk_index}"
            + (f", 第{c.page}页" if c.page else "")
        )
        lines.append(c.content)
        lines.append("")
    return "\n".join(lines).strip()