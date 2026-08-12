import { useState, useEffect } from 'react'
import {
  Table, Button, Modal, Form, Input, Select, Upload, message, Popconfirm,
  Space, Tag, Drawer, Empty, Spin, Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { InboxOutlined, SearchOutlined, DeleteOutlined, FileTextOutlined } from '@ant-design/icons'
import {
  getKnowledgeDocs, uploadKnowledgeDoc, deleteKnowledgeDoc, searchKnowledge,
  DOC_TYPE_OPTIONS,
  type KnowledgeDoc, type KnowledgeSearchHit,
} from '../api/knowledge'

const { Text } = Typography
const { Dragger } = Upload

// 文档类型 -> {label,color} 映射
const DOC_TYPE_MAP = Object.fromEntries(DOC_TYPE_OPTIONS.map((o) => [o.value, o]))

// 状态 -> Tag 颜色映射
const STATUS_COLOR: Record<string, string> = {
  pending: 'default',
  processing: 'processing',
  ready: 'green',
  failed: 'red',
}
const STATUS_LABEL: Record<string, string> = {
  pending: '待处理',
  processing: '处理中',
  ready: '已就绪',
  failed: '失败',
}

export default function Knowledge() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([])
  const [loading, setLoading] = useState(false)
  const [filterType, setFilterType] = useState<string | undefined>(undefined)

  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fileList, setFileList] = useState<File | null>(null)
  const [form] = Form.useForm()

  const [searchOpen, setSearchOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [hits, setHits] = useState<KnowledgeSearchHit[]>([])
  const [searchForm] = Form.useForm()

  const fetchDocs = async (type?: string) => {
    setLoading(true)
    try {
      const data = await getKnowledgeDocs(type)
      setDocs(data)
    } catch {
      message.error('获取知识库文档列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocs(filterType)
  }, [filterType])

  const handleUpload = async () => {
    try {
      const values = await form.validateFields()
      if (!fileList) {
        message.warning('请先选择文件')
        return
      }
      setUploading(true)
      await uploadKnowledgeDoc({
        file: fileList,
        title: values.title,
        doc_type: values.doc_type,
        tags: values.tags,
      })
      message.success('上传成功，已自动入库向量化')
      setUploadOpen(false)
      form.resetFields()
      setFileList(null)
      fetchDocs(filterType)
    } catch (e: any) {
      // axios 错误：后端可能返回 detail
      const detail = e?.response?.data?.detail
      if (detail) message.error(`上传失败：${detail}`)
      // 表单校验失败不提示（antd 已提示）
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteKnowledgeDoc(id)
      message.success('删除成功')
      fetchDocs(filterType)
    } catch {
      message.error('删除失败')
    }
  }

  const handleSearch = async () => {
    try {
      const values = await searchForm.validateFields()
      setSearching(true)
      const res = await searchKnowledge({
        query: values.query,
        doc_type: values.doc_type || undefined,
        top_k: values.top_k || undefined,
      })
      setHits(res)
      if (res.length === 0) message.info('未检索到相关内容')
    } catch {
      message.error('检索失败')
    } finally {
      setSearching(false)
    }
  }

  const columns: ColumnsType<KnowledgeDoc> = [
    {
      title: '标题', dataIndex: 'title', key: 'title',
      render: (v, r) => (
        <Space>
          <FileTextOutlined style={{ color: '#1677ff' }} />
          <span>{v}</span>
          {r.status !== 'ready' && (
            <Tag color={STATUS_COLOR[r.status]} style={{ marginLeft: 4 }}>
              {STATUS_LABEL[r.status] || r.status}
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: '类型', dataIndex: 'doc_type', key: 'doc_type', width: 100,
      render: (v: string) => {
        const opt = DOC_TYPE_MAP[v]
        return opt ? <Tag color={opt.color}>{opt.label}</Tag> : v
      },
    },
    { title: '来源', dataIndex: 'source', key: 'source', width: 160, render: (v) => v || '-' },
    { title: '分块', dataIndex: 'chunk_count', key: 'chunk_count', width: 70, align: 'center' },
    {
      title: '标签', dataIndex: 'tags', key: 'tags', width: 140,
      render: (v: string | null) => v
        ? v.split(',').filter(Boolean).map((t) => <Tag key={t}>{t.trim()}</Tag>)
        : '-',
    },
    {
      title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 170,
      render: (v: string) => new Date(v).toLocaleString(),
    },
    {
      title: '操作', key: 'action', width: 90,
      render: (_, record) => (
        <Popconfirm
          title="确定删除该文档？"
          description="将同时删除其向量数据"
          onConfirm={() => handleDelete(record.id)}
        >
          <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Text strong style={{ fontSize: 16 }}>知识库管理</Text>
          <Select
            allowClear
            placeholder="按类型筛选"
            style={{ width: 160 }}
            value={filterType}
            onChange={(v) => setFilterType(v)}
            options={DOC_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
        </Space>
        <Space>
          <Button icon={<SearchOutlined />} onClick={() => setSearchOpen(true)}>检索测试</Button>
          <Button type="primary" onClick={() => { form.resetFields(); setFileList(null); setUploadOpen(true) }}>
            上传文档
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={docs}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      {/* 上传 Modal */}
      <Modal
        title="上传知识库文档"
        open={uploadOpen}
        onOk={handleUpload}
        confirmLoading={uploading}
        onCancel={() => { setUploadOpen(false); form.resetFields(); setFileList(null) }}
        okText={uploading ? '入库中...' : '上传'}
        cancelText="取消"
        width={560}
        maskClosable={!uploading}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="title" label="文档标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="如：Nginx 故障排查手册" />
          </Form.Item>
          <Form.Item name="doc_type" label="文档类型" rules={[{ required: true, message: '请选择类型' }]}>
            <Select
              placeholder="选择类型"
              options={DOC_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
          </Form.Item>
          <Form.Item name="tags" label="标签" extra="逗号分隔，如：nginx,web,线上">
            <Input placeholder="nginx,web" />
          </Form.Item>
          <Form.Item label="文档文件" required>
            <Dragger
              accept=".pdf,.md,.markdown,.txt,.log"
              maxCount={1}
              beforeUpload={(file) => {
                setFileList(file)
                return false // 阻止自动上传，由按钮触发
              }}
              onRemove={() => { setFileList(null); return true }}
              fileList={fileList ? [{
                uid: '-1', name: fileList.name, size: fileList.size, type: fileList.type,
              } as any] : []}
            >
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">支持 PDF / Markdown / Txt / Log，单文件</p>
            </Dragger>
          </Form.Item>
        </Form>
      </Modal>

      {/* 检索测试 Drawer */}
      <Drawer
        title="知识库检索测试"
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        width={620}
      >
        <Form form={searchForm} layout="vertical" initialValues={{ top_k: 5 }}>
          <Form.Item name="query" label="检索问题" rules={[{ required: true, message: '请输入检索内容' }]}>
            <Input.TextArea
              placeholder="如：磁盘满了怎么排查"
              autoSize={{ minRows: 2, maxRows: 4 }}
              onPressEnter={(e) => { if (!e.shiftKey) { e.preventDefault(); handleSearch() } }}
            />
          </Form.Item>
          <Space style={{ width: '100%', marginBottom: 16 }} align="start">
            <Form.Item name="doc_type" label="类型过滤" style={{ width: 160, marginBottom: 0 }}>
              <Select
                allowClear
                placeholder="全部类型"
                options={DOC_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              />
            </Form.Item>
            <Form.Item name="top_k" label="Top K" style={{ width: 100, marginBottom: 0 }}>
              <Select options={[2, 3, 5, 8, 10].map((n) => ({ value: n, label: `${n}` }))} />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" icon={<SearchOutlined />} loading={searching} onClick={handleSearch}>
                检索
              </Button>
            </Form.Item>
          </Space>
        </Form>

        <div style={{ marginTop: 8 }}>
          {searching ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
          ) : hits.length === 0 ? (
            <Empty description="暂无检索结果" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {hits.map((h, i) => {
                const opt = DOC_TYPE_MAP[h.doc_type]
                return (
                  <div
                    key={`${h.doc_id}-${h.chunk_index}-${i}`}
                    style={{
                      border: '1px solid #f0f0f0', borderRadius: 6, padding: 12,
                      background: '#fafafa',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Space>
                        <Tag color="blue">#{i + 1}</Tag>
                        <Text strong style={{ fontSize: 13 }}>{h.title}</Text>
                        {opt && <Tag color={opt.color}>{opt.label}</Tag>}
                        {h.page != null && <Text type="secondary" style={{ fontSize: 12 }}>第 {h.page} 页</Text>}
                      </Space>
                      <Text type="secondary" style={{ fontSize: 11 }}>score: {h.score.toFixed(4)}</Text>
                    </div>
                    <div style={{ fontSize: 12, color: '#999', marginBottom: 6 }}>
                      来源：{h.source || '-'}
                      {h.tags && ` · 标签：${h.tags}`}
                    </div>
                    <pre style={{
                      margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      fontSize: 12, color: '#333', maxHeight: 160, overflow: 'auto',
                    }}>
                      {h.content}
                    </pre>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Drawer>
    </div>
  )
}
