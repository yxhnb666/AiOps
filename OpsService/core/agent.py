from langchain.chat_models import init_chat_model
from services.model_config import get_decrypted_api_key
from models.model_config import ModelConfig
from agent.tools import list_servers, execute_remote_command, retrieve_knowledge
from langgraph.prebuilt import create_react_agent
from core.redis import get_checkpointer

SYSTEM_PROMPT = """你是一个智能运维助手，帮助用户管理远程服务器。

可用工具：
- list_servers：列出所有可管理的服务器
- execute_remote_command：在指定服务器上执行 shell 命令
- retrieve_knowledge：检索运维知识库（手册、故障案例、SOP、历史日志）

工作原则：
1. 当用户提到主机但未提供 ID 时，先调用 list_servers 查看可用主机
2. 执行命令前确认目标服务器 ID 正确
3. 遇到危险命令（rm -rf、shutdown、mkfs、dd 等）要先提醒用户风险
4. 用中文简洁地总结命令结果，不要原样堆砌大段输出
5. 用户问"主机状态"等模糊问题时，主动用 df -h / free -m / top -bn1 等命令采集
6. **回答故障排查、命令用法、运维流程类问题时，先调用 retrieve_knowledge 检索知识库**，优先依据检索到的内容作答，并在回答末尾标注引用来源（文档名 + 类型）
7. 检索结果与实时命令结果可结合使用：先查知识库找思路，再用 execute_remote_command 落地验证
"""


def get_llm(config: ModelConfig):
    return init_chat_model(
        model=config.model_name,
        model_provider=config.provider,
        api_key=get_decrypted_api_key(config),
        base_url=config.base_url,
        temperature=config.temperature,
    )


def build_agent(config: ModelConfig):
    agent = create_react_agent(
        model=get_llm(config),
        tools=[list_servers, execute_remote_command, retrieve_knowledge],
        prompt=SYSTEM_PROMPT,
        checkpointer=get_checkpointer(),
    )
    return agent
