import { Card, Row, Col } from 'antd'
import { CloudServerOutlined, RobotOutlined, SettingOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

function Home() {
  const navigate = useNavigate()

  const menuItems = [
    {
      title: '主机管理',
      desc: '管理远程服务器、SSH 连接与命令执行',
      icon: <CloudServerOutlined style={{ fontSize: 32, color: '#1677ff' }} />,
      path: '/servers',
    },
    {
      title: 'AI 运维助手',
      desc: '用自然语言让 AI 查询主机状态、执行运维命令',
      icon: <RobotOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
      path: '/chat',
    },
    {
      title: '模型配置',
      desc: '管理 AI 模型的 API Key、接入地址与默认模型',
      icon: <SettingOutlined style={{ fontSize: 32, color: '#faad14' }} />,
      path: '/model-configs',
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginBottom: 24 }}>功能导航</h2>
      <Row gutter={[16, 16]}>
        {menuItems.map((item) => (
          <Col key={item.path} xs={24} sm={12} md={8}>
            <Card
              hoverable
              onClick={() => navigate(item.path)}
              style={{ height: '100%' }}
            >
              <div style={{ marginBottom: 12 }}>{item.icon}</div>
              <h3 style={{ marginBottom: 8 }}>{item.title}</h3>
              <p style={{ color: '#999', margin: 0 }}>{item.desc}</p>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  )
}

export default Home
