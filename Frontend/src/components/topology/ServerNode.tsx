import { CloudServerOutlined } from '@ant-design/icons'

export interface ServerNodeData {
  id: number
  name: string
  ip: string
  status: string // online / offline
}

/**
 * 服务器节点 - 与 AI 大脑相连
 * 点击弹出操作菜单
 */
export default function ServerNode({ name, ip, status }: ServerNodeData) {
  const isOnline = status === 'online'
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        background: '#fff',
        borderRadius: 8,
        border: `2px solid ${isOnline ? '#52c41a' : '#d9d9d9'}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        cursor: 'pointer',
        boxSizing: 'border-box',
        transition: 'box-shadow 0.2s, transform 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <CloudServerOutlined style={{ fontSize: 24, color: isOnline ? '#52c41a' : '#bfbfbf' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </div>
        <div style={{ fontSize: 11, color: '#999' }}>{ip}</div>
      </div>
      {/* 状态指示灯 */}
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: isOnline ? '#52c41a' : '#bfbfbf',
          boxShadow: isOnline ? '0 0 6px #52c41a' : 'none',
          flexShrink: 0,
        }}
      />
    </div>
  )
}
