import { Collapse, Tag, Spin, Empty } from 'antd'
import { BookOutlined } from '@ant-design/icons'

export interface KnowledgeRef {
  index: string
  source: string
  content: string
}

/**
 * 解析 retrieve_knowledge 工具输出（rag/retriever.py 的 format_for_prompt 格式）：
 *   [1] 来源：{title}（{doc_type}），文档ID={doc_id}, 分块#{chunk_index}, 第{page}页
 *   {content}
 *   [2] 来源：...
 * 返回结构化引用列表；解析失败返回空数组（调用方走退化展示）。
 */
export function parseKnowledgeRefs(output: string): KnowledgeRef[] {
  if (!output) return []
  const lines = output.split('\n')
  const refs: KnowledgeRef[] = []
  let current: KnowledgeRef | null = null
  const re = /^\[(\d+)\]\s*来源：(.+)$/
  for (const line of lines) {
    const m = line.match(re)
    if (m) {
      if (current) refs.push(current)
      current = { index: m[1], source: m[2].trim(), content: '' }
    } else if (current) {
      current.content += (current.content ? '\n' : '') + line
    }
  }
  if (current) refs.push(current)
  return refs.map((r) => ({ ...r, content: r.content.trim() }))
}

interface KnowledgeRefsCardProps {
  /** retrieve_knowledge 工具的 output 文本 */
  output?: string
  /** 是否仍在执行（tool_start 后、tool_end 前） */
  loading?: boolean
  /** 紧凑模式：嵌入弹框用更小字号 */
  compact?: boolean
}

/**
 * 知识库引用来源卡片：把 retrieve_knowledge 工具的输出渲染为可折叠的来源列表，
 * 让用户清楚 AI 回答参考了哪些知识库片段。
 */
export default function KnowledgeRefsCard({ output, loading, compact }: KnowledgeRefsCardProps) {
  const refs = parseKnowledgeRefs(output || '')
  const fontSize = compact ? 11 : 12

  return (
    <div
      style={{
        marginBottom: 4,
        borderRadius: 6,
        border: '1px solid #d3adf7',
        background: '#f9f0ff',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: compact ? '4px 10px' : '6px 12px',
          background: '#efdbff',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize,
          fontWeight: 600,
          color: '#531dab',
        }}
      >
        <BookOutlined />
        <span>知识库引用来源</span>
        {loading && <Spin size="small" />}
        {!loading && refs.length > 0 && (
          <Tag color="purple" style={{ margin: 0, marginLeft: 4 }}>{refs.length} 条</Tag>
        )}
      </div>

      <div style={{ padding: compact ? '4px 8px' : '6px 10px' }}>
        {loading ? null : refs.length === 0 ? (
          output ? (
            <pre
              style={{
                margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                fontSize, color: '#666',
              }}
            >
              {output}
            </pre>
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="无引用"
              style={{ margin: '4px 0' }}
            />
          )
        ) : (
          <Collapse
            size="small"
            ghost
            defaultActiveKey={refs.length <= 3 ? refs.map((r) => r.index) : [refs[0].index]}
            items={refs.map((r) => ({
              key: r.index,
              label: (
                <span style={{ fontSize, color: '#531dab' }}>
                  <Tag color="purple" style={{ margin: 0, marginRight: 4 }}>#{r.index}</Tag>
                  {r.source}
                </span>
              ),
              children: (
                <pre
                  style={{
                    margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    fontSize, color: '#333', maxHeight: compact ? 140 : 200, overflow: 'auto',
                    background: '#fff', padding: 8, borderRadius: 4,
                  }}
                >
                  {r.content}
                </pre>
              ),
            }))}
          />
        )}
      </div>
    </div>
  )
}
