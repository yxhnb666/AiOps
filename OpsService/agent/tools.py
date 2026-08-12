from langchain_core.tools import tool
from config.database import async_session
from services.server import get_server, get_servers
from core.ssh import execute_ssh_command
from langgraph.types import interrupt
from agent.security import check_command_risk
from services.knowledge import search as knowledge_search


@tool
async def list_servers() -> str:
    """列出所有可管理的远程服务器，返回服务器 ID、名称、IP 和状态。
    当用户询问有哪些主机、或想查看主机但未提供 ID 时调用此工具。

    Returns:
        服务器列表，每行一台，格式：ID | 名称 | IP | 状态
    """
    async with async_session() as db:
        servers = await get_servers(db)
        if not servers:
            return "当前没有任何服务器"
        lines = [f"{s.id} | {s.name} | {s.ip} | {s.status}" for s in servers]
        return "\n".join(lines)


@tool
async def execute_remote_command(server_id: int, command: str) -> str:
    """在指定的远程服务器上执行 shell 命令，返回命令输出结果。
    用于查询主机状态、磁盘、进程、日志等运维操作。

    Args:
        server_id: 目标服务器的 ID（整数）
        command: 要执行的 shell 命令，例如 "df -h"、"top -bn1"、"free -m"

    Returns:
        命令的标准输出文本；若服务器不存在或执行失败，返回错误说明
    """
    is_dangerous,reason = check_command_risk(command)
    if is_dangerous:
        approved = interrupt({
          "command": command,
          "reason": reason,
          "server_id": server_id
        })
        if not approved:
            return f"用户已拒绝执行高危命令：{command}（{reason}）"
            
    async with async_session() as db:
        server = await get_server(db, server_id)
        if not server:
            return f"错误：服务器 ID {server_id} 不存在"
        try:
            result = await execute_ssh_command(server, command)
            return result if result else "(命令无输出)"
        except Exception as e:
            return f"命令执行失败：{e}"


@tool
async def retrieve_knowledge(query: str, doc_type: str = "") -> str:
    """检索运维知识库，返回相关文档片段供回答参考。

    适用场景：用户问故障排查思路、命令用法、运维 SOP、历史故障案例时调用。
    不适用场景：实时执行命令、查看当前主机状态（用 execute_remote_command）。

    Args:
        query: 检索问题，用关键词形式描述（如 "磁盘满 排查步骤"）。
        doc_type: 可选过滤，取值：manual（手册）/ case（故障案例）/ sop（操作规范）/ log（历史日志）。
                  空字符串表示不限定类型，全库检索。

    Returns:
        命中的知识片段（按相关度排序），每条标注来源文档与类型；
        若无命中或知识库未就绪，返回提示信息。
    """
    from rag.retriever import format_for_prompt

    async with async_session() as db:
        try:
            hits = await knowledge_search(
                db=db,
                query=query,
                doc_type=doc_type or None,
            )
        except Exception as e:
            return f"知识库检索失败：{e}"

    if not hits:
        return "知识库中未检索到相关内容，请基于通用知识回答。"

    return format_for_prompt(hits)