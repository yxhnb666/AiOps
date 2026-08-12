import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Select, Switch, Slider, message, Popconfirm, Space, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  getModelConfigs,
  createModelConfig,
  updateModelConfig,
  deleteModelConfig,
  type ModelConfig,
  type ModelConfigCreateData,
} from '../api/modelConfig'

// Provider 选项：第一波后端用 ChatOpenAI，openai/deepseek 均兼容此接口
const PROVIDER_OPTIONS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'alibaba_dashscope', label: '阿里云通义千问 (DashScope)' },
  { value: 'anthropic', label: 'Anthropic (Claude) - 后续支持' },
  { value: 'gemini', label: 'Google Gemini - 后续支持' },
]

export default function ModelConfigPage() {
  const [configs, setConfigs] = useState<ModelConfig[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<ModelConfig | null>(null)
  const [form] = Form.useForm()

  const fetchConfigs = async () => {
    setLoading(true)
    try {
      const data = await getModelConfigs()
      setConfigs(data)
    } catch {
      message.error('获取模型配置列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfigs()
  }, [])

  const handleAdd = () => {
    setEditingConfig(null)
    form.resetFields()
    form.setFieldsValue({ provider: 'deepseek', is_default: false, temperature: 0.7 })
    setModalOpen(true)
  }

  const handleEdit = (record: ModelConfig) => {
    setEditingConfig(record)
    form.setFieldsValue({
      name: record.name,
      provider: record.provider,
      model_name: record.model_name,
      base_url: record.base_url,
      is_default: record.is_default,
      temperature: record.temperature,
      // 编辑时不回填 api_key（接口不返回，留空表示不改）
      api_key: '',
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingConfig) {
        // 更新：api_key 留空则不传（保持原值）
        const updateData = { ...values }
        if (!updateData.api_key) {
          delete updateData.api_key
        }
        await updateModelConfig(editingConfig.id, updateData)
        message.success('更新成功')
      } else {
        await createModelConfig(values as ModelConfigCreateData)
        message.success('添加成功')
      }
      setModalOpen(false)
      fetchConfigs()
    } catch {
      // 表单校验失败或请求失败
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteModelConfig(id)
      message.success('删除成功')
      fetchConfigs()
    } catch {
      message.error('删除失败')
    }
  }

  // 快速设为默认
  const handleSetDefault = async (record: ModelConfig) => {
    try {
      await updateModelConfig(record.id, { is_default: true })
      message.success(`已将「${record.name}」设为默认模型`)
      fetchConfigs()
    } catch {
      message.error('设置失败')
    }
  }

  const columns: ColumnsType<ModelConfig> = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: 'Provider', dataIndex: 'provider', key: 'provider', width: 120 },
    { title: '模型名', dataIndex: 'model_name', key: 'model_name' },
    {
      title: 'Base URL',
      dataIndex: 'base_url',
      key: 'base_url',
      render: (v) => v || '-',
    },
    {
      title: '默认',
      dataIndex: 'is_default',
      key: 'is_default',
      width: 80,
      render: (v) => (v ? <Tag color="green">默认</Tag> : '-'),
    },
    {
      title: '温度',
      dataIndex: 'temperature',
      key: 'temperature',
      width: 80,
    },
    {
      title: '操作',
      key: 'action',
      width: 260,
      render: (_, record) => (
        <Space>
          {!record.is_default && (
            <Button size="small" onClick={() => handleSetDefault(record)}>
              设为默认
            </Button>
          )}
          <Button size="small" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={handleAdd}>
          添加模型配置
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={configs}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingConfig ? '编辑模型配置' : '添加模型配置'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={560}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="配置名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="我的 DeepSeek" />
          </Form.Item>
          <Form.Item name="provider" label="Provider" rules={[{ required: true }]}>
            <Select options={PROVIDER_OPTIONS} />
          </Form.Item>
          <Form.Item
            name="model_name"
            label="模型名"
            rules={[{ required: true, message: '请输入模型名' }]}
          >
            <Input placeholder="deepseek-chat / gpt-4o" />
          </Form.Item>
          <Form.Item
            name="api_key"
            label="API Key"
            rules={editingConfig ? [] : [{ required: true, message: '请输入 API Key' }]}
            extra={editingConfig ? '留空表示不修改原 Key' : undefined}
          >
            <Input.Password placeholder="sk-..." />
          </Form.Item>
          <Form.Item name="base_url" label="Base URL" extra="兼容 OpenAI 接口的服务地址，如 https://api.deepseek.com">
            <Input placeholder="https://api.deepseek.com" />
          </Form.Item>
          <Form.Item name="temperature" label="温度（0~2，越高越随机）">
            <Slider min={0} max={2} step={0.1} />
          </Form.Item>
          <Form.Item name="is_default" label="设为默认模型" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
