// 对话 API：SSE 流式响应需用 fetch + ReadableStream 解析（EventSource 不支持自定义请求头）
// token 过期自动刷新逻辑与 OpsRequest.ts 保持一致

export interface SSEEvent {
  type: 'token' | 'tool_start' | 'tool_end' | 'approval_required' | 'done'
  content?: string
  name?: string
  output?: string
  command?: string
  reason?: string
  server_id?: number
}

/** 清除登录态并跳转登录页 */
function redirectToLogin() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  window.location.href = '/login'
}

/**
 * 带 token 自动刷新的 fetch：
 * 收到 401 时用 refreshToken 刷新 access token 并重试一次（仅重试一次，防止死循环）。
 * SSE 流式请求的 401 在响应体开始前返回，此时流尚未读取，可安全重试。
 */
async function authFetch(url: string, options: RequestInit): Promise<Response> {
  const res = await fetch(url, options)

  // 非 401 直接返回
  if (res.status !== 401) return res

  // 401：尝试用 refreshToken 刷新
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) {
    redirectToLogin()
    throw new Error('登录已过期，请重新登录')
  }

  try {
    const refreshRes = await fetch(`${import.meta.env.VITE_USER_API_URL}/api/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    })
    if (!refreshRes.ok) throw new Error('刷新失败')
    const data = await refreshRes.json()
    localStorage.setItem('accessToken', data.access)
  } catch {
    redirectToLogin()
    throw new Error('登录已过期，请重新登录')
  }

  // 用新 token 重试原请求
  const newToken = localStorage.getItem('accessToken')
  return fetch(url, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${newToken}` },
  })
}

/** 解析 SSE 流，逐条回调 */
async function parseSSEStream(res: Response, onEvent: (evt: SSEEvent) => void) {
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    // SSE 事件以空行分隔
    const events = buffer.split('\n\n')
    buffer = events.pop() || ''
    for (const evt of events) {
      const line = evt.split('\n').find((l) => l.startsWith('data: '))
      if (line) {
        try {
          onEvent(JSON.parse(line.slice(6)))
        } catch {
          // 忽略解析失败的片段
        }
      }
    }
  }
}

/** 构造带鉴权头的请求选项 */
function buildOptions(body: object): RequestInit {
  const token = localStorage.getItem('accessToken')
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  }
}

/** 发送对话消息，流式接收事件 */
export async function streamChat(
  message: string,
  sessionId: string,
  onEvent: (evt: SSEEvent) => void,
) {
  const res = await authFetch(
    `${import.meta.env.VITE_OPS_API_URL}/api/v1/chat`,
    buildOptions({ message, session_id: sessionId }),
  )
  if (!res.ok) throw new Error(`请求失败: ${res.status}`)
  await parseSSEStream(res, onEvent)
}

/** 审批高危命令后恢复执行，流式接收后续事件 */
export async function streamApprove(
  sessionId: string,
  approved: boolean,
  onEvent: (evt: SSEEvent) => void,
) {
  const res = await authFetch(
    `${import.meta.env.VITE_OPS_API_URL}/api/v1/chat/approve`,
    buildOptions({ session_id: sessionId, approved }),
  )
  if (!res.ok) throw new Error(`请求失败: ${res.status}`)
  await parseSSEStream(res, onEvent)
}
