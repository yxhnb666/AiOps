import { RobotOutlined } from '@ant-design/icons'

export interface AINodeData {
  modelName?: string
  isActive?: boolean
}

/**
 * AI 大脑节点 - 顶部展示，统筹所有服务器
 * 点击后跳转到 AI 对话页
 */
export default function AINode({ modelName, isActive }: AINodeData) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1677ff 0%, #722ed1 100%)',
        borderRadius: '50%',
        boxShadow: isActive
          ? '0 0 24px rgba(22, 119, 255, 0.6), 0 0 48px rgba(114, 46, 209, 0.3)'
          : '0 4px 12px rgba(0,0,0,0.15)',
        cursor: 'pointer',
        position: 'relative',
        transition: 'box-shadow 0.3s',
      }}
    >
      {/* 脉动光环 */}
      {isActive && (
        <div
          style={{
            position: 'absolute',
            inset: -6,
            borderRadius: '50%',
            border: '2px solid rgba(22, 119, 255, 0.4)',
            animation: 'ai-pulse 2s ease-in-out infinite',
          }}
        />
      )}
      <RobotOutlined style={{ fontSize: 28, color: '#fff' }} />
      <div style={{ color: '#fff', fontSize: 12, marginTop: 4, fontWeight: 600 }}>
        AI 大脑
      </div>
      {modelName && (
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, marginTop: 2 }}>
          {modelName}
        </div>
      )}
      <style>{`
        @keyframes ai-pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.15); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
