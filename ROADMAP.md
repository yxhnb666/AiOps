# My-AiOps 发展路线图

> 定位：**AI-Native 智能运维平台** — 简历级开源项目，覆盖前端 / 全栈 / Agent 开发三大求职方向

## 项目愿景

打造一个让面试官眼前一亮的 AI 驱动运维平台，技术栈覆盖前端可视化、全栈架构、AI Agent 编排三大领域，每个模块都有可深挖的技术故事，每个功能都能在面试中讲出深度。

## 简历定位矩阵

| 求职方向 | 核心亮点 | 技术关键词 |
|---------|---------|-----------|
| **前端开发** | 3D 机房可视化 + 拓扑编排 + 监控大屏 + 流式渲染 | React 18 / X6 / Three.js / ECharts / SSE / WebSocket / 微前端 |
| **全栈开发** | Django + FastAPI 双后端 + 容器化 + CI/CD + 监控告警 | FastAPI / Django / Docker / K8s / Prometheus / ELK / Redis |
| **Agent 开发** | LangGraph 多 Agent 协作 + RAG + MCP + 自愈闭环 | LangGraph / RAG / Vector DB / MCP / Function Calling / HITL |

---

## 已完成（第一波：最小 AI 闭环）

- [x] Redis 接入（LangGraph Checkpoint 基础设施）
- [x] ModelConfig 多模型配置管理（OpenAI/DeepSeek/通义千问）
- [x] SSH 封装为 LangChain Tool（list_servers / execute_remote_command）
- [x] LangGraph ReAct Agent（意图识别 → 工具调用 → 结果总结）
- [x] SSE 流式聊天接口（astream_events v2）
- [x] 高危命令 HITL 审批（interrupt + Command resume）
- [x] X6 拓扑可视化（AI 大脑 + 服务器节点 + 流动连线）
- [x] 嵌入式可拖拽对话弹框（拓扑页同屏联动）
- [x] 前端模型配置侧边栏 + Axios Token 自动刷新

---

## Phase 2：AI Agent 深度化（核心差异化）

> 目标：从单轮 ReAct 升级为多 Agent 协作 + RAG 增强 + 自愈闭环，这是简历最能讲深度的部分

### 2.1 RAG 运维知识库

**简历亮点**：基于向量检索的运维知识增强，Agent 回答前先检索历史故障案例和运维手册

- [ ] 引入向量数据库（Chroma / Qdrant）
- [ ] 构建运维知识索引：Linux 手册、常见故障案例、公司内部运维 SOP
- [ ] LangGraph 新增 `knowledge_retrieval` 节点：Agent 回答前先 RAG 检索
- [ ] 前端知识库管理页：上传文档（PDF/Markdown）→ 自动分块 → 向量化 → 入库
- [ ] 检索结果可视化：对话中展示引用的知识片段来源

**技术栈**：ChromaDB / langchain-text-splitters / embedding model / FastAPI 文件上传

### 2.2 多 Agent 协作编排

**简历亮点**：从单 Agent 升级为 Supervisor + Worker 多 Agent 架构，模拟真实运维团队分工

- [ ] Supervisor Agent：接收用户请求，拆解任务，分发给专家 Agent
- [ ] Diagnostic Agent：专做故障诊断，调用日志检索 + 指标分析工具
- [ ] Execution Agent：专做命令执行，带审批闸门
- [ ] Report Agent：汇总各 Agent 结果，生成运维报告
- [ ] LangGraph `add_messages` + `Send` API 实现并行 Agent 调度
- [ ] 前端 Agent 思考过程可视化：展示 Agent 间的消息传递和协作流程图

**技术栈**：LangGraph Multi-Agent / langgraph-supervisor / 并行工具调用

### 2.3 自动根因分析 + 自愈闭环

**简历亮点**：告警触发 → AI 自动分析根因 → 生成修复方案 → 人工确认 → 自动执行修复

- [ ] 告警 webhook 接入（Prometheus Alertmanager → FastAPI）
- [ ] 根因分析 Agent：收到告警后自动收集日志、指标、拓扑关系
- [ ] 修复方案生成：基于 RAG 知识库 + 历史案例匹配
- [ ] 自愈执行：低风险自动修复（如重启服务），高风险人工审批
- [ ] 前端告警时间线可视化：告警 → 分析 → 修复全过程追踪

**技术栈**：Prometheus Alertmanager Webhook / LangGraph State Machine / 历史案例匹配

### 2.4 MCP 协议工具生态

**简历亮点**：接入 Model Context Protocol 标准，支持第三方工具热插拔

- [ ] 实现 MCP Server：把现有 SSH/监控工具暴露为 MCP 工具
- [ ] MCP Client 集成：Agent 可调用外部 MCP Server 的工具
- [ ] 前端工具市场页：浏览 / 安装 / 配置 MCP 工具
- [ ] 自定义脚本工具：用户上传 Python/Shell 脚本 → 自动解析参数 → 注册为工具

**技术栈**：MCP Protocol / FastMCP / 脚本沙箱执行

---

## Phase 3：前端可视化惊艳化

> 目标：让面试官打开项目首页就被震撼，前端技术深度拉满

### 3.1 3D 机房可视化

**简历亮点**：Three.js 构建 3D 机房场景，服务器机柜立体展示，点击机柜下钻到服务器详情

- [ ] Three.js + React Three Fiber 构建 3D 机房场景
- [ ] 机柜 3D 模型：按真实机房布局排列，支持旋转/缩放/漫游
- [ ] 服务器状态映射：CPU/内存使用率映射为机柜颜色（绿→黄→红）
- [ ] 点击机柜 → 下钻到机柜内服务器列表 → 点击服务器 → 弹出详情面板
- [ ] 告警动画：故障服务器机柜闪烁红光 + 烟雾粒子效果

**技术栈**：Three.js / @react-three/fiber / @react-three/drei / WebGL

### 3.2 实时监控大屏

**简历亮点**：运维监控大屏，多服务器指标实时滚动，ECharts 动态图表 + 数字翻牌动画

- [ ] 大屏布局：12 列网格，可拖拽调整组件位置
- [ ] 实时指标卡片：CPU/内存/磁盘/网络，数字翻牌动画 + 趋势迷你图
- [ ] 多服务器对比图表：ECharts 折线图 + 柱状图 + 雷达图
- [ ] 告警滚动条：底部实时滚动最新告警信息
- [ ] WebSocket 推送：后端定时采集指标 → WS 推送 → 前端实时更新

**技术栈**：ECharts / WebSocket / @dnd-kit/grid / 数字翻牌组件

### 3.3 拓扑编排增强

**简历亮点**：从只读拓扑升级为可编排拓扑，拖拽连线、分组管理、流量动画

- [ ] 节点拖拽 + 连线编排：用户可手动调整拓扑布局
- [ ] 分组容器：机柜分组 / 环境分组（生产/测试/开发）
- [ ] 流量动画：SSH 命令下发时连线产生数据流动画
- [ ] 小地图导航：右下角缩略图，大拓扑可快速定位
- [ ] 拓扑导出：导出为 PNG / JSON 配置

**技术栈**：AntV X6 高级特性 / 拖拽交互 / 小地图插件

### 3.4 微前端架构演进

**简历亮点**：从单页应用升级为微前端架构，每个功能模块独立部署

- [ ] qiankun / wujie 微前端框架接入
- [ ] 主应用：拓扑首页 + 导航 + 鉴权
- [ ] 子应用：AI 对话 / 监控大屏 / CI/CD / 日志分析 独立打包部署
- [ ] 子应用间通信：CustomEvent / SharedStore
- [ ] 按需加载：用户访问对应模块时才加载子应用资源

**技术栈**：qiankun / wujie / 模块联邦 / 独立部署

---

## Phase 4：可观测性体系

> 目标：补齐运维平台核心能力，全栈技术深度体现

### 4.1 主机指标采集

- [ ] 定时采集任务：复用 SSH 通道，每 30s 采集 CPU/内存/磁盘/网络
- [ ] 时序数据存储：Prometheus / InfluxDB
- [ ] 指标 API：FastAPI 暴露查询接口，支持时间范围聚合
- [ ] 前端指标图表：ECharts 趋势图 + 时间范围选择器

### 4.2 告警系统

- [ ] 告警规则引擎：阈值规则（CPU > 80%）+ 趋势规则（连续上涨）
- [ ] 告警等级：info / warning / error / critical
- [ ] 告警通知：WebSocket 实时推送 + 邮件通知
- [ ] 告警收敛：相同告警合并，避免告警风暴
- [ ] 前端告警中心：告警列表 + 确认 + 处理记录

### 4.3 ELK 日志集成

- [ ] Elasticsearch 接入：配置 ES 连接 + 索引模式
- [ ] 日志搜索页：全文搜索 + 字段过滤 + 时间范围
- [ ] 日志高亮：搜索关键词高亮显示
- [ ] Kibana Dashboard 嵌入：iframe 嵌入已有 Kibana 面板

### 4.4 Grafana 集成

- [ ] Grafana API 对接：获取 Dashboard 列表
- [ ] 面板嵌入：iframe 嵌入 Grafana 面板
- [ ] SSO 单点登录：Grafana 与平台统一鉴权

---

## Phase 5：DevOps + CI/CD

> 目标：补齐企业级运维平台必备能力

### 5.1 项目与流水线

- [ ] CICDProject 模型：仓库地址、分支、构建脚本
- [ ] Pipeline 模型：流水线阶段配置（构建/测试/部署）
- [ ] Git 凭证管理：加密存储 Git Token
- [ ] 流水线执行：触发 → 阶段流转 → 日志实时输出

### 5.2 Jenkins 集成

- [ ] Jenkins REST API 客户端
- [ ] Job 管理：创建 / 触发 / 停止 / 查看日志
- [ ] 构建历史 + 构建趋势图

### 5.3 部署审批 + 回滚

- [ ] 多级审批工作流：开发 → 测试 → 运维逐级审批
- [ ] 部署模板：K8s / Docker / Shell / Ansible
- [ ] 一键回滚：回滚到上一稳定版本
- [ ] 定时部署：cron 表达式调度

---

## Phase 6：企业级能力

> 目标：生产可用的安全性和协作能力

### 6.1 RBAC 权限体系

- [ ] Role / Permission / PermissionGroup 模型
- [ ] 用户角色分配 + 权限继承
- [ ] 前端按钮级权限控制
- [ ] 注册审批流：管理员审批后才能登录

### 6.2 审计日志

- [ ] AuthLog：登录 / 登出 / Token 刷新
- [ ] SystemLog：命令执行 / 部署 / 配置变更
- [ ] AI 操作日志：Agent 工具调用记录
- [ ] 审计日志查询页：时间 / 用户 / 操作类型筛选

### 6.3 容器化部署

- [ ] docker-compose 编排：frontend + django + fastapi + postgres + redis
- [ ] 一键部署脚本：install-docker.sh
- [ ] K8s Helm Chart：支持 K8s 集群部署
- [ ] CI 自动构建：GitHub Actions 构建镜像推送

### 6.4 通知系统

- [ ] Notification 模型 + WebSocket 实时推送
- [ ] 审批消息 / 告警 / 部署状态变更通知
- [ ] 邮件通知 + 钉钉 / 企业微信 Webhook

---

## 实施优先级

```
Phase 2（Agent 深度）  ← 当前，简历核心差异化
    ↓
Phase 3（前端惊艳）    ← 紧随其后，视觉冲击力
    ↓
Phase 4（可观测性）    ← 补齐运维平台能力
    ↓
Phase 5（CI/CD）       ← 企业级功能
    ↓
Phase 6（企业级）      ← 收尾完善
```

**Phase 2 和 Phase 3 优先做**，因为：
- Phase 2 是 Agent 求职的核心竞争力，也是项目最大差异化
- Phase 3 是前端求职的核心竞争力，面试官第一眼看到的就是前端
- 两者完成后，简历三个方向都有硬核亮点

---

## 简历亮点映射表

| 功能模块 | 前端求职 | 全栈求职 | Agent 求职 |
|---------|---------|---------|-----------|
| LangGraph 多 Agent 协作 | Agent 思考过程可视化 | Multi-Agent 架构设计 | Supervisor-Worker 编排 |
| RAG 运维知识库 | 知识库管理 + 引用展示 | 向量数据库集成 | 检索增强生成 |
| 自愈闭环 | 告警时间线可视化 | 告警 Webhook 全链路 | 根因分析 Agent |
| 3D 机房可视化 | Three.js / R3F | WebGL 性能优化 | — |
| 实时监控大屏 | ECharts / WS 实时更新 | 指标采集 + 时序存储 | — |
| 拓扑编排 | X6 高级交互 / 拖拽 | — | — |
| MCP 工具生态 | 工具市场 UI | 工具沙箱执行 | MCP 协议集成 |
| 微前端架构 | qiankun / 模块联邦 | 独立部署 CI/CD | — |
| ELK 日志集成 | 日志搜索 + 高亮 | ES 查询优化 | — |
| CI/CD 流水线 | 流水线可视化 | Jenkins API / 部署编排 | — |
| RBAC + 审计 | 按钮级权限控制 | 权限模型设计 | — |
| 容器化部署 | — | Docker / K8s / Helm | — |

---

## 技术栈全景

### 前端
React 18 / TypeScript / Vite / Ant Design / AntV X6 / Three.js + R3F / ECharts / qiankun / WebSocket / SSE / Axios

### 后端
FastAPI / Django / SQLAlchemy + asyncpg / asyncssh / LangGraph / LangChain / Redis / ChromaDB / Celery

### 基础设施
Docker / docker-compose / K8s / Helm / GitHub Actions / Prometheus / Grafana / ELK / Nginx

### AI / Agent
LangGraph / LangChain / OpenAI / DeepSeek / 通义千问 / RAG / Vector DB / MCP / Function Calling / HITL
