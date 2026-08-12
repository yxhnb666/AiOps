from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
from langchain_text_splitters import RecursiveCharacterTextSplitter
from config.settings import RAG_CHUNK_OVERLAP, RAG_CHUNK_SIZE
from utils.logger_handler import logger

@dataclass
class Chunk:
    index: int
    content: str
    page: int | None = None

def chunk_file(file_path: str | Path,file_ext: str) -> list[Chunk]:
    path = Path(file_path)
    ext = file_ext.lower()
    raw_text: str
    pages: list[str] | None = None

    if ext == ".pdf":
      raw_text, pages = _extract_pdf(path)
      logger.info(f"PDF 原始文本：{raw_text[:100]}...")
      logger.info(f"PDF 分页：{len(pages)} 页")
    else:
      raw_text = path.read_text(
        encoding="utf-8",
        errors="ignore"
      )
      logger.info(f"文本文件原始文本：{raw_text[:100]}...")
    splitter = RecursiveCharacterTextSplitter(
      chunk_size=RAG_CHUNK_SIZE,
      chunk_overlap=RAG_CHUNK_OVERLAP,
      is_separator_regex=True,
      separators=["\n\n", "\n", "。", "；", " ", ""],
    )

    if pages is None:
      pieces = [p for p in splitter.split_text(raw_text) if p.strip()]
      return [Chunk(index=i, content=p) for i, p in enumerate(pieces)]
    chunks: list[Chunk] = []
    idx = 0
    for page_no, page_text in enumerate(pages, start=1):
      if not page_text.strip():
          continue
      pieces = splitter.split_text(page_text)
      for p in pieces:
        if not p.strip():
          continue
        chunks.append(Chunk(index=idx, content=p, page=page_no))
        idx += 1
    logger.info(f"分块完成：{len(chunks)} 个块，最短{min(len(c.content) for c in chunks)}字，最长{max(len(c.content) for c in chunks)}字")
    return chunks

def _extract_pdf(path: Path) -> tuple[str, list[str]]:
    from pypdf import PdfReader
    reader = PdfReader(str(path))
    pages = []
    for page in reader.pages:
        try:
            pages.append(page.extract_text() or "")
        except Exception:
            pages.append("")
    return "\n\n".join(pages), pages
