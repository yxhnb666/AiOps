import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, InputNumber, Select, message, Popconfirm, Space, Tag, Drawer } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  getServers, createServer, updateServer, deleteServer,
  testConnection, executeCommand,
  type Server, type ServerCreateData,
} from '../api/server'

export default function Servers() {
  const [servers, setServers] = useState<Server[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingServer, setEditingServer] = useState<Server | null>(null)
  const [form] = Form.useForm()
  const [cmdDrawerOpen, setCmdDrawerOpen] = useState(false)
  const [currentServer, setCurrentServer] = useState<Server | null>(null)
  const [command, setCommand] = useState('')
  const [output, setOutput] = useState('')
  const [cmdLoading, setCmdLoading] = useState(false)

  const fetchServers = async () => {
    setLoading(true)
    try {
      const data = await getServers()
      setServers(data)
    } catch {
      message.error('获取服务器列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchServers()
  }, [])

  const handleAdd = () => {
    setEditingServer(null)
    form.resetFields()
    form.setFieldsValue({ port: 22, auth_type: 'password' })
    setModalOpen(true)
  }

  const handleEdit = (record: Server) => {
    setEditingServer(record)
    form.setFieldsValue(record)
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingServer) {
        await updateServer(editingServer.id, values)
        message.success('更新成功')
      } else {
        await createServer(values as ServerCreateData)
        message.success('添加成功')
      }
      setModalOpen(false)
      fetchServers()
    } catch {
      // 表单校验失败或请求失败
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteServer(id)
      message.success('删除成功')
      fetchServers()
    } catch {
      message.error('删除失败')
    }
  }

  const handleTestConnection = async (id: number) => {
    const hide = message.loading('测试连接中...')
    try {
      const res = await testConnection(id)
      if (res.success) {
        message.success(res.msg)
      } else {
        message.error(res.msg)
      }
    } catch {
      message.error('请求失败')
    } finally {
      hide()
    }
  }

  const handleExecuteCommand = async () => {
    if (!currentServer || !command) return
    setCmdLoading(true)
    setOutput('')
    try {
      const res = await executeCommand(currentServer.id, command)
      setOutput(res.result)
    } catch {
      message.error('执行失败')
    } finally {
      setCmdLoading(false)
    }
  }

  const openCmdDrawer = (record: Server) => {
    setCurrentServer(record)
    setCommand('')
    setOutput('')
    setCmdDrawerOpen(true)
  }

  const columns: ColumnsType<Server> = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: 'IP', dataIndex: 'ip', key: 'ip' },
    { title: '端口', dataIndex: 'port', key: 'port', width: 80 },
    { title: '系统', dataIndex: 'os', key: 'os', render: (v) => v || '-' },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (v) => <Tag color={v === 'online' ? 'green' : 'default'}>{v}</Tag>
    },
    { title: '用户名', dataIndex: 'username', key: 'username' },
    {
      title: '操作', key: 'action', width: 320,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => handleTestConnection(record.id)}>测试连接</Button>
          <Button size="small" onClick={() => openCmdDrawer(record)}>执行命令</Button>
          <Button size="small" onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      )
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={handleAdd}>添加服务器</Button>
      </div>

      <Table
        columns={columns}
        dataSource={servers}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingServer ? '编辑服务器' : '添加服务器'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={560}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input placeholder="我的服务器" />
          </Form.Item>
          <Form.Item name="hostname" label="主机名" rules={[{ required: true }]}>
            <Input placeholder="server.example.com" />
          </Form.Item>
          <Form.Item name="ip" label="IP 地址" rules={[{ required: true }]}>
            <Input placeholder="192.168.1.100" />
          </Form.Item>
          <Form.Item name="port" label="端口" rules={[{ required: true }]}>
            <InputNumber min={1} max={65535} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="os" label="操作系统">
            <Input placeholder="Ubuntu 22.04" />
          </Form.Item>
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
            <Input placeholder="root" />
          </Form.Item>
          <Form.Item name="auth_type" label="认证方式">
            <Select options={[
              { value: 'password', label: '密码' },
              { value: 'key', label: '密钥' },
            ]} />
          </Form.Item>
          <Form.Item name="password" label="密码">
            <Input.Password placeholder="输入 SSH 密码" />
          </Form.Item>
          <Form.Item name="key_path" label="密钥路径">
            <Input placeholder="~/.ssh/id_rsa" />
          </Form.Item>
          <Form.Item name="tags" label="标签">
            <Input placeholder="web,db" />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={`执行命令 - ${currentServer?.name}`}
        open={cmdDrawerOpen}
        onClose={() => setCmdDrawerOpen(false)}
        size={600}
      >
        <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
          <Input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="输入命令，如 df -h"
            onPressEnter={handleExecuteCommand}
          />
          <Button type="primary" loading={cmdLoading} onClick={handleExecuteCommand}>执行</Button>
        </Space.Compact>
        <Input.TextArea
          value={output}
          readOnly
          autoSize={{ minRows: 15 }}
          style={{ fontFamily: 'monospace', backgroundColor: '#1e1e1e', color: '#d4d4d4' }}
          placeholder="命令输出将显示在这里"
        />
      </Drawer>
    </div>
  )
}