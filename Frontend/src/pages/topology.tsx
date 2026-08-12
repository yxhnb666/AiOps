import { useEffect, useRef, useState } from 'react'
import { Graph } from '@antv/x6'
import { Layout, Button, Space, Modal, Input, Select, Form, message, Tag, Empty, Tooltip, Switch } from 'antd'
import { PlusOutlined, ReloadOutlined, ThunderboltOutlined, DeleteOutlined, SettingOutlined, RobotOutlined, CloseOutlined, BookOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import ChatPanel from '../components/ChatPanel'
import { getServers, createServer, deleteServer, testConnection, type Server, type ServerCreateData } from '../api/server'
import { getModelConfigs, createModelConfig, deleteModelConfig, updateModelConfig, type ModelConfig, type ModelConfigCreateData } from '../api/modelConfig'

const { Sider, Content } = Layout

const PROVIDER_OPTIONS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'alibaba_dashscope', label: '阿里云通义千问 (DashScope)' },
  { value: 'anthropic', label: 'Anthropic (Claude) - 后续支持' },
  { value: 'gemini', label: 'Google Gemini - 后续支持' },
]

const AI_NODE_ID = 'ai-brain'

export default function Topology() {
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<Graph | null>(null)
  const navigate = useNavigate()

  const [servers, setServers] = useState<Server[]>([])
  const [models, setModels] = useState<ModelConfig[]>([])
  const [loading, setLoading] = useState(false)
  const [serverModalOpen, setServerModalOpen] = useState(false)
  const [modelModalOpen, setModelModalOpen] = useState(false)
  const [serverForm] = Form.useForm<ServerCreateData>()
  const [modelForm] = Form.useForm<ModelConfigCreateData>()
  const [serverMenu, setServerMenu] = useState<{ server: Server; x: number; y: number } | null>(null)
  const [chatPos, setChatPos] = useState<{ x: number; y: number } | null>(null)
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)

  // 加载数据
  const loadData = async () => {
    setLoading(true)
    try {
      const [serverList, modelList] = await Promise.all([getServers(), getModelConfigs()])
      setServers(serverList)
      setModels(modelList)
      renderGraph(serverList, modelList)

      // 并行测试所有服务器连接，实时更新节点状态
      checkServerStatuses(serverList)
    } catch (e) {
      message.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  // 并行测试服务器连接状态，逐台更新节点颜色
  const checkServerStatuses = (serverList: Server[]) => {
    const graph = graphRef.current
    if (!graph) return
    serverList.forEach(async (s) => {
      try {
        const res = await testConnection(s.id)
        const isOnline = res.success
        const nodeId = `server-${s.id}`
        const node = graph.getCellById(nodeId)
        if (node) {
          node.setAttrByPath('body/stroke', isOnline ? '#52c41a' : '#d9d9d9')
          node.setAttrByPath('label/text', `${s.name}\n${s.ip}  ${isOnline ? '● 在线' : '○ 离线'}`)
        }
      } catch {
        // 连接测试失败，保持离线状态
      }
    })
  }

  // 渲染拓扑图
  const renderGraph = (serverList: Server[], modelList: ModelConfig[]) => {
    const graph = graphRef.current
    if (!graph) return

    graph.clearCells()

    const container = containerRef.current!
    const width = container.clientWidth
    const centerX = width / 2

    // 默认模型名称
    const defaultModel = modelList.find((m) => m.is_default) || modelList[0]

    // AI 大脑节点 - 顶部居中，用 X6 原生圆形节点
    graph.addNode({
      shape: 'ellipse',
      id: AI_NODE_ID,
      x: centerX - 60,
      y: 40,
      width: 120,
      height: 120,
      attrs: {
        body: {
          fill: '#1677ff',
          stroke: '#722ed1',
          strokeWidth: 3,
        },
        label: {
          text: defaultModel ? `AI 大脑\n${defaultModel.name}` : 'AI 大脑\n(未配置)',
          fill: '#fff',
          fontSize: 12,
          fontWeight: 600,
          textAnchor: 'middle',
          textVerticalAnchor: 'middle',
        },
      },
      data: { type: 'ai' },
    })

    // 服务器节点 - 下方水平排列，用 X6 原生矩形节点
    const serverNodeWidth = 180
    const serverNodeHeight = 60
    const serverY = 260
    const spacing = 220
    const totalWidth = serverList.length * spacing
    const startX = centerX - totalWidth / 2 + (spacing - serverNodeWidth) / 2

    serverList.forEach((s, i) => {
      const nodeId = `server-${s.id}`
      const isOnline = s.status === 'online'
      graph.addNode({
        shape: 'rect',
        id: nodeId,
        x: startX + i * spacing,
        y: serverY,
        width: serverNodeWidth,
        height: serverNodeHeight,
        attrs: {
          body: {
            fill: '#fff',
            stroke: isOnline ? '#52c41a' : '#d9d9d9',
            strokeWidth: 2,
            rx: 8,
            ry: 8,
          },
          label: {
            text: `${s.name}\n${s.ip}  ${isOnline ? '● 在线' : '○ 离线'}`,
            fill: '#333',
            fontSize: 12,
            textAnchor: 'middle',
            textVerticalAnchor: 'middle',
            lineHeight: '1.4em',
          },
        },
        data: { type: 'server', serverId: s.id, serverData: s },
      })

      // AI 大脑 → 服务器 连线（带流动动画）
      graph.addEdge({
        source: AI_NODE_ID,
        target: nodeId,
        attrs: {
          line: {
            stroke: '#1677ff',
            strokeWidth: 2,
            strokeDasharray: '6 4',
            targetMarker: { name: 'block', width: 6, height: 6 },
            animation: {
              strokeDashoffset: { repeat: true, duration: 800, values: '10;0' },
            },
          },
        },
      })
    })
  }

  // 初始化画布
  useEffect(() => {
    if (!containerRef.current) return

    const graph = new Graph({
      container: containerRef.current,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      grid: { visible: true, size: 10, type: 'dot' },
      panning: true,
      mousewheel: true,
      interacting: { nodeMovable: false, edgeMovable: false },
    })
    graphRef.current = graph

    // 节点点击事件
    graph.on('node:click', ({ node, e }) => {
      const data = node.getData()
      if (data.type === 'ai') {
        // 以点击位置为弹框左上角，确保不超出视口
        const panelW = 460
        const panelH = 520
        const x = Math.min(e.clientX, window.innerWidth - panelW - 10)
        const y = Math.min(e.clientY, window.innerHeight - panelH - 10)
        setChatPos({ x, y })
      } else if (data.type === 'server') {
        setServerMenu({ server: data.serverData, x: e.clientX, y: e.clientY })
      }
    })

    // 点击空白处关闭服务器菜单
    graph.on('blank:click', () => {
      setServerMenu(null)
    })

    // 窗口大小变化时重绘
    const handleResize = () => {
      if (containerRef.current && graphRef.current) {
        graphRef.current.resize(containerRef.current.clientWidth, containerRef.current.clientHeight)
        renderGraph(servers, models)
      }
    }
    window.addEventListener('resize', handleResize)

    loadData()

    return () => {
      window.removeEventListener('resize', handleResize)
      graph.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 删除服务器节点
  const handleDeleteServer = (server: Server) => {
    setServerMenu(null)
    Modal.confirm({
      title: '确认删除',
      content: `确定删除服务器「${server.name}」吗？`,
      onOk: async () => {
        await deleteServer(server.id)
        message.success('删除成功')
        loadData()
      },
    })
  }

  // 添加服务器
  const handleAddServer = async () => {
    const values = await serverForm.validateFields()
    await createServer(values)
    message.success('服务器添加成功')
    setServerModalOpen(false)
    serverForm.resetFields()
    loadData()
  }

  // 添加模型
  const handleAddModel = async () => {
    const values = await modelForm.validateFields()
    await createModelConfig(values)
    message.success('模型添加成功')
    setModelModalOpen(false)
    modelForm.resetFields()
    loadData()
  }

  // 设为默认模型
  const handleSetDefault = async (model: ModelConfig) => {
    await updateModelConfig(model.id, { is_default: true })
    message.success(`已将「${model.name}」设为默认模型`)
    loadData()
  }

  // 删除模型
  const handleDeleteModel = async (model: ModelConfig) => {
    await deleteModelConfig(model.id)
    message.success('删除成功')
    loadData()
  }

  const defaultModel = models.find((m) => m.is_default)

  return (
    <Layout style={{ height: '100vh' }}>
      {/* 左侧侧边栏 - 模型配置 */}
      <Sider
        width={280}
        theme="light"
        style={{ borderRight: '1px solid #f0f0f0', overflow: 'auto', padding: '16px 12px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>
            <SettingOutlined style={{ marginRight: 6 }} />
            模型配置
          </span>
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setModelModalOpen(true)}>
            添加
          </Button>
        </div>

        {models.length === 0 ? (
          <Empty description="暂无模型配置" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {models.map((m) => (
              <div
                key={m.id}
                style={{
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: `1px solid ${m.is_default ? '#1677ff' : '#f0f0f0'}`,
                  background: m.is_default ? '#f0f5ff' : '#fff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 500, fontSize: 13 }}>{m.name}</span>
                  {m.is_default && <Tag color="blue" style={{ margin: 0 }}>默认</Tag>}
                </div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                  {m.provider} · {m.model_name}
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                  {!m.is_default && (
                    <Button size="small" type="link" style={{ padding: 0 }} onClick={() => handleSetDefault(m)}>
                      设为默认
                    </Button>
                  )}
                  <Button size="small" type="link" danger style={{ padding: 0 }} onClick={() => handleDeleteModel(m)}>
                    删除
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Sider>

      {/* 主内容区 - 拓扑画布 */}
      <Content style={{ position: 'relative', background: '#fafafa' }}>
        {/* 顶部工具栏 */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            background: '#fff',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            padding: '6px 12px',
          }}
        >
          <Space>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>运维拓扑</span>
            {defaultModel && (
              <Tag color="blue" icon={<RobotOutlined />}>{defaultModel.name}</Tag>
            )}
            <Button size="small" icon={<PlusOutlined />} onClick={() => setServerModalOpen(true)}>
              添加服务器
            </Button>
            <Button size="small" icon={<BookOutlined />} onClick={() => navigate('/knowledge')}>
              知识库
            </Button>
            <Tooltip title="刷新">
              <Button size="small" icon={<ReloadOutlined />} onClick={loadData} loading={loading} />
            </Tooltip>
          </Space>
        </div>

        {/* X6 画布容器 */}
        <div
          ref={containerRef}
          style={{ width: '100%', height: '100%' }}
        />

        {/* 服务器浮动操作菜单 */}
        {serverMenu && (
          <>
            {/* 透明遮罩，点击关闭菜单 */}
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 99 }}
              onClick={() => setServerMenu(null)}
            />
            <div
              style={{
                position: 'fixed',
                left: serverMenu.x,
                top: serverMenu.y,
                zIndex: 100,
                background: '#fff',
                borderRadius: 8,
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                padding: 4,
                minWidth: 140,
              }}
            >
              <div style={{ padding: '6px 12px', fontSize: 12, color: '#999', borderBottom: '1px solid #f0f0f0', marginBottom: 4 }}>
                {serverMenu.server.name} ({serverMenu.server.ip})
              </div>
              <div
                style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                onClick={() => { setServerMenu(null); navigate('/chat') }}
              >
                <RobotOutlined style={{ color: '#1677ff' }} /> AI 对话
              </div>
              <div
                style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                onClick={() => { setServerMenu(null); navigate('/servers') }}
              >
                <ThunderboltOutlined style={{ color: '#52c41a' }} /> SSH 终端
              </div>
              <div style={{ height: 1, background: '#f0f0f0', margin: '4px 0' }} />
              <div
                style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8, color: '#ff4d4f' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#fff1f0')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                onClick={() => handleDeleteServer(serverMenu.server)}
              >
                <DeleteOutlined /> 删除节点
              </div>
            </div>
          </>
        )}

        {/* AI 对话浮动弹框 */}
        {chatPos && (
          <div
            style={{
              position: 'fixed',
              left: chatPos.x,
              top: chatPos.y,
              width: 460,
              height: 520,
              background: '#fff',
              borderRadius: 8,
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              zIndex: 200,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* 标题栏 - 可拖拽 */}
            <div
              style={{
                padding: '8px 12px',
                background: 'linear-gradient(135deg, #1677ff 0%, #722ed1 100%)',
                color: '#fff',
                cursor: 'move',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
              onMouseDown={(e) => {
                dragRef.current = { startX: e.clientX, startY: e.clientY, origX: chatPos.x, origY: chatPos.y }
                const onMove = (ev: MouseEvent) => {
                  if (!dragRef.current) return
                  const dx = ev.clientX - dragRef.current.startX
                  const dy = ev.clientY - dragRef.current.startY
                  setChatPos({
                    x: Math.max(0, Math.min(dragRef.current.origX + dx, window.innerWidth - 460)),
                    y: Math.max(0, Math.min(dragRef.current.origY + dy, window.innerHeight - 520)),
                  })
                }
                const onUp = () => {
                  dragRef.current = null
                  document.removeEventListener('mousemove', onMove)
                  document.removeEventListener('mouseup', onUp)
                }
                document.addEventListener('mousemove', onMove)
                document.addEventListener('mouseup', onUp)
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 13 }}>
                <RobotOutlined style={{ marginRight: 6 }} />
                AI 运维助手
              </span>
              <CloseOutlined
                style={{ cursor: 'pointer', fontSize: 14 }}
                onClick={() => setChatPos(null)}
              />
            </div>
            {/* 对话内容区 */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <ChatPanel />
            </div>
          </div>
        )}
      </Content>

      {/* 添加服务器 Modal */}
      <Modal
        title="添加服务器节点"
        open={serverModalOpen}
        onOk={handleAddServer}
        onCancel={() => { setServerModalOpen(false); serverForm.resetFields() }}
        okText="添加"
        cancelText="取消"
        width={480}
      >
        <Form form={serverForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如：Web 服务器 1" />
          </Form.Item>
          <Form.Item name="hostname" label="主机名" rules={[{ required: true }]}>
            <Input placeholder="server.example.com" />
          </Form.Item>
          <Form.Item name="ip" label="IP 地址" rules={[{ required: true, message: '请输入 IP' }]}>
            <Input placeholder="如：192.168.1.100" />
          </Form.Item>
          <Form.Item name="port" label="SSH 端口" initialValue={22}>
            <Input type="number" />
          </Form.Item>
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input placeholder="如：root" />
          </Form.Item>
          <Form.Item name="password" label="密码">
            <Input.Password placeholder="SSH 密码" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 添加模型 Modal */}
      <Modal
        title="添加模型配置"
        open={modelModalOpen}
        onOk={handleAddModel}
        onCancel={() => { setModelModalOpen(false); modelForm.resetFields() }}
        okText="添加"
        cancelText="取消"
        width={520}
      >
        <Form form={modelForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如：DeepSeek 默认" />
          </Form.Item>
          <Form.Item name="provider" label="服务商" rules={[{ required: true, message: '请选择服务商' }]}>
            <Select options={PROVIDER_OPTIONS} placeholder="选择模型服务商" />
          </Form.Item>
          <Form.Item name="model_name" label="模型名" rules={[{ required: true, message: '请输入模型名' }]}>
            <Input placeholder="如：deepseek-chat / qwen3-max" />
          </Form.Item>
          <Form.Item name="api_key" label="API Key" rules={[{ required: true, message: '请输入 API Key' }]}>
            <Input.Password placeholder="sk-..." />
          </Form.Item>
          <Form.Item name="base_url" label="Base URL">
            <Input placeholder="兼容 OpenAI 格式的接入地址（含 /v1）" />
          </Form.Item>
          <Form.Item name="is_default" label="设为默认模型" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  )
}
