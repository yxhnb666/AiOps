import { useState, useRef, useEffect } from 'react'
import { Input, Button, Modal, Tag, Card, Spin, Typography, message } from 'antd'
import {
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  ToolOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { streamChat, streamApprove, type SSEEvent } from '../api/chat'
import KnowledgeRefsCard from '../components/KnowledgeRefs'
import { KNOWLEDGE_TOOL_NAME } from '../api/knowledge'

const { Text, Paragraph } = Typography

interface ToolCall {
  name: string
  status: 'running' | 'done'
  output?: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  tools?: ToolCall[]
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingApproval, setPendingApproval] = useState<SSEEvent | null>(null)
  // 会话ID：首次进入生成一次，整个会话复用，保证多轮上下文
  const sessionId = useRef(`session-${Date.now()}`)
  // 当前正在流式输出的 AI 消息ID，审批恢复时继续追加到这条
  const activeAiId = useRef<string | null>(null)
  const msgEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 统一处理 SSE 事件，追加到指定 AI 消息
  const handleEvent = (evt: SSEEvent) => {
    const targetId = activeAiId.current
    if (!targetId) return

    switch (evt.type) {
      case 'token':
        setMessages((prev) =>
          prev.map((m) =>
            m.id === targetId ? { ...m, content: m.content + (evt.content || '') } : m,
          ),
        )
        break
      case 'tool_start':
        setMessages((prev) =>
          prev.map((m) =>
            m.id === targetId
              ? { ...m, tools: [...(m.tools || []), { name: evt.name || '', status: 'running' }] }
              : m,
          ),
        )
        break
      case 'tool_end':
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== targetId) return m
            const tools = [...(m.tools || [])]
            // 更新最后一个 running 的工具为完成
            for (let i = tools.length - 1; i >= 0; i--) {
              if (tools[i].status === 'running') {
                tools[i] = { ...tools[i], status: 'done', output: evt.output }
                break
              }
            }
            return { ...m, tools }
          }),
        )
        break
      case 'approval_required':
        setPendingApproval(evt)
        break
      case 'done':
        activeAiId.current = null
        break
    }
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: text }
    const aiMsg: ChatMessage = { id: `a-${Date.now()}`, role: 'assistant', content: '', tools: [] }
    activeAiId.current = aiMsg.id
    setMessages((prev) => [...prev, userMsg, aiMsg])
    setLoading(true)

    try {
      await streamChat(text, sessionId.current, handleEvent)
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === aiMsg.id ? { ...m, content: '⚠️ 请求失败，请重试' } : m)),
      )
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (approved: boolean) => {
    if (!pendingApproval) return
    setPendingApproval(null)
    setLoading(true)
    try {
      // 审批恢复后继续追加到原 AI 消息
      await streamApprove(sessionId.current, approved, handleEvent)
    } catch {
      message.error('审批请求失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)' }}>
      {/* 顶部标题栏 */}
      <div
        style={{
          padding: '12px 24px',
          borderBottom: '1px solid #f0f0f0',
          background: '#fff',
        }}
      >
        <Text strong>
          <RobotOutlined style={{ marginRight: 8 }} />
          AI 运维助手
        </Text>
        <Text type="secondary" style={{ marginLeft: 16, fontSize: 12 }}>
          会话ID: {sessionId.current}
        </Text>
      </div>

      {/* 消息列表区 */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 24,
          background: '#f5f5f5',
        }}
      >
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#999', marginTop: 80 }}>
            <RobotOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <div>向 AI 助手提问，例如："列出所有主机"、"查看服务器1的磁盘使用情况"</div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: msg.role === 'user' ? '#1677ff' : '#52c41a',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
            </div>
            <div
              style={{
                maxWidth: '70%',
                marginLeft: msg.role === 'user' ? 0 : 12,
                marginRight: msg.role === 'user' ? 12 : 0,
              }}
            >
              {/* 工具调用卡片 */}
              {msg.tools && msg.tools.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  {msg.tools.map((tool, idx) =>
                    tool.name === KNOWLEDGE_TOOL_NAME ? (
                      <KnowledgeRefsCard
                        key={idx}
                        output={tool.output}
                        loading={tool.status === 'running'}
                      />
                    ) : (
                      <Card
                        key={idx}
                        size="small"
                        style={{ marginBottom: 4, background: '#fafafa' }}
                        title={
                          <span style={{ fontSize: 12 }}>
                            <ToolOutlined style={{ marginRight: 4 }} />
                            {tool.name}
                            {tool.status === 'running' && (
                              <Spin size="small" style={{ marginLeft: 8 }} />
                            )}
                            {tool.status === 'done' && (
                              <Tag color="green" style={{ marginLeft: 8 }}>
                                完成
                              </Tag>
                            )}
                          </span>
                        }
                      >
                        {tool.status === 'done' && tool.output && (
                          <pre
                            style={{
                              margin: 0,
                              maxHeight: 200,
                              overflow: 'auto',
                              fontSize: 12,
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-all',
                            }}
                          >
                            {tool.output}
                          </pre>
                        )}
                      </Card>
                    ),
                  )}
                </div>
              )}

              {/* 文本内容气泡 */}
              {msg.content && (
                <div
                  style={{
                    padding: '10px 16px',
                    borderRadius: 8,
                    background: msg.role === 'user' ? '#1677ff' : '#fff',
                    color: msg.role === 'user' ? '#fff' : '#333',
                    border: msg.role === 'user' ? 'none' : '1px solid #e8e8e8',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.content}
                  {msg.role === 'assistant' && loading && activeAiId.current === msg.id && (
                    <Spin size="small" style={{ marginLeft: 4 }} />
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={msgEndRef} />
      </div>

      {/* 输入区 */}
      <div style={{ padding: 16, background: '#fff', borderTop: '1px solid #f0f0f0' }}>
        <Input.TextArea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入消息，Enter 发送，Shift+Enter 换行"
          autoSize={{ minRows: 1, maxRows: 4 }}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          style={{ marginBottom: 8 }}
        />
        <div style={{ textAlign: 'right' }}>
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={loading}
            onClick={handleSend}
            disabled={!input.trim()}
          >
            发送
          </Button>
        </div>
      </div>

      {/* 高危命令审批弹窗 */}
      <Modal
        title={
          <span style={{ color: '#faad14' }}>
            <WarningOutlined style={{ marginRight: 8 }} />
            高危命令审批
          </span>
        }
        open={!!pendingApproval}
        onOk={() => handleApprove(true)}
        onCancel={() => handleApprove(false)}
        okText="确认执行"
        cancelText="拒绝执行"
        okButtonProps={{ danger: true }}
      >
        <Paragraph>
          <Text type="warning">检测到高危命令，需要你确认后才会执行：</Text>
        </Paragraph>
        <div
          style={{
            background: '#1e1e1e',
            color: '#d4d4d4',
            padding: 12,
            borderRadius: 6,
            fontFamily: 'monospace',
            margin: '12px 0',
          }}
        >
          {pendingApproval?.command}
        </div>
        <Text type="secondary">风险原因：{pendingApproval?.reason}</Text>
      </Modal>
    </div>
  )
}
