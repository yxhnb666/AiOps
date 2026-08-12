import { get, post, put, del } from './OpsRequest'

// --- 类型定义 ---

export interface ModelConfig {
  id: number
  name: string
  provider: string
  model_name: string
  base_url: string | null
  is_default: boolean
  temperature: number
  created_at: string
  updated_at: string
}

export interface ModelConfigCreateData {
  name: string
  provider: string
  model_name: string
  api_key: string
  base_url?: string
  is_default?: boolean
  temperature?: number
}

export type ModelConfigUpdateData = Partial<Omit<ModelConfigCreateData, 'api_key'>> & {
  api_key?: string
}

// --- ModelConfig API ---

export const getModelConfigs = () =>
  get<ModelConfig[]>('/api/v1/model-configs')

export const getModelConfig = (id: number) =>
  get<ModelConfig>(`/api/v1/model-configs/${id}`)

export const createModelConfig = (data: ModelConfigCreateData) =>
  post<ModelConfig>('/api/v1/model-configs', data)

export const updateModelConfig = (id: number, data: ModelConfigUpdateData) =>
  put<ModelConfig>(`/api/v1/model-configs/${id}`, data)

export const deleteModelConfig = (id: number) =>
  del(`/api/v1/model-configs/${id}`)
