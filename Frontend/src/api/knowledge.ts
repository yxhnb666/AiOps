import { get, post, del } from './OpsRequest'
import request from './OpsRequest'

// --- 类型定义 ---

export interface KnowledgeDoc {
  id: number
  title: string
  doc_type: string
  source: string | null
  file_path: string | null
  content_hash: string
  chunk_count: number
  status: string // pending / processing / ready / failed
  tags: string | null
  created_at: string
  updated_at: string
}

export interface KnowledgeSearchHit {
  doc_id: number
  doc_type: string
  title: string
  source: string
  tags: string
  chunk_index: number
  page: number | null
  content: string
  score: number
}

// 文档类型选项（与后端 ALLOWED_DOC_TYPES 对齐）
export const DOC_TYPE_OPTIONS = [
  { value: 'manual', label: '手册', color: 'blue' },
  { value: 'case', label: '故障案例', color: 'orange' },
  { value: 'sop', label: '操作规范', color: 'green' },
  { value: 'log', label: '历史日志', color: 'purple' },
] as const

// 后端 retrieve_knowledge 工具名，前端据此识别"引用来源"卡片
export const KNOWLEDGE_TOOL_NAME = 'retrieve_knowledge'

// --- Knowledge API ---

export const getKnowledgeDocs = (docType?: string) =>
  get<KnowledgeDoc[]>('/api/v1/knowledge/docs', docType ? { doc_type: docType } : undefined)

export const getKnowledgeDoc = (id: number) =>
  get<KnowledgeDoc>(`/api/v1/knowledge/docs/${id}`)

export const uploadKnowledgeDoc = (data: {
  file: File
  title: string
  doc_type: string
  tags?: string
}) => {
  const formData = new FormData()
  formData.append('file', data.file)
  formData.append('title', data.title)
  formData.append('doc_type', data.doc_type)
  if (data.tags) formData.append('tags', data.tags)
  // multipart 上传需走 axios 实例，让浏览器自动设置 boundary
  return request
    .post<KnowledgeDoc>('/api/v1/knowledge/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000, // 大文件 / 向量化耗时较长
    })
    .then((res) => res.data)
}

export const deleteKnowledgeDoc = (id: number) =>
  del<void>(`/api/v1/knowledge/docs/${id}`)

export const searchKnowledge = (data: { query: string; doc_type?: string; top_k?: number }) =>
  post<KnowledgeSearchHit[]>('/api/v1/knowledge/search', data)
