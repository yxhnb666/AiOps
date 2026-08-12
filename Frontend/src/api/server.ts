import { get, post, put, del } from './OpsRequest'

// --- 类型定义 ---

export interface Server {
  id: number
  name: string
  hostname: string
  ip: string
  port: number
  os: string | null
  status: string
  username: string
  auth_type: string
  key_path: string | null
  tags: string | null
  group_id: number | null
  created_at: string
  updated_at: string
}

export interface ServerGroup {
  id: number
  name: string
  description: string | null
  color: string | null
  created_at: string
}

export interface ServerCreateData {
  name: string
  hostname: string
  ip: string
  port?: number
  os?: string
  username: string
  auth_type?: string
  password?: string
  key_path?: string
  tags?: string
  group_id?: number
}

export type ServerUpdateData = Partial<ServerCreateData>

// --- Server API ---

export const getServers = (groupId?: number) =>
  get<Server[]>('/api/v1/servers', groupId ? { group_id: groupId } : undefined)

export const getServer = (id: number) =>
  get<Server>(`/api/v1/servers/${id}`)

export const createServer = (data: ServerCreateData) =>
  post<Server>('/api/v1/servers', data)

export const updateServer = (id: number, data: ServerUpdateData) =>
  put<Server>(`/api/v1/servers/${id}`, data)

export const deleteServer = (id: number) =>
  del(`/api/v1/servers/${id}`)

export const testConnection = (id: number) =>
  post<{ success: boolean; msg: string }>(`/api/v1/servers/${id}/test-connection`)

export const executeCommand = (id: number, command: string) =>
  post<{ result: string }>(`/api/v1/servers/${id}/execute-command`, { command })

// --- ServerGroup API ---

export const getServerGroups = () =>
  get<ServerGroup[]>('/api/v1/server-groups')

export const createServerGroup = (data: { name: string; description?: string; color?: string }) =>
  post<ServerGroup>('/api/v1/server-groups', data)

export const deleteServerGroup = (id: number) =>
  del(`/api/v1/server-groups/${id}`)