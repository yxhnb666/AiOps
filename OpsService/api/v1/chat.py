import json
from fastapi import APIRouter, Depends,HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from langgraph.types import Command
from config.database import get_db
from core.auth import get_current_user
from services.model_config import get_default_model_config,get_model_config
from core.agent import build_agent

router = APIRouter(prefix="/api/v1/chat",tags=["Ai对话"])

class ChatRequest(BaseModel):
  message: str
  session_id: str | None = None
  model_config_id: int | None = None

async def event_stream(agent, message: str, thread_id: str):
  config = {"configurable": {"thread_id": thread_id}}
  async for event in agent.astream_events(
    {"messages":[("user", message)]},
    config=config,
    version="v2"
  ):
    kind = event["event"]
    if kind == "on_chat_model_stream":
      chunk = event["data"]["chunk"]
      if chunk.content:
        yield f"data: {json.dumps({"type": "token", "content": chunk.content},ensure_ascii=False)}\n\n"

    elif kind == "on_tool_start":
      yield f"data: {json.dumps({"type": "tool_start", "name": event["name"]},ensure_ascii=False)}\n\n"
    
    elif kind == "on_tool_end":
      # 工具执行结束
      output = str(event["data"].get("output", ""))
      yield f"data: {json.dumps({'type': 'tool_end', 'name': event['name'], 'output': output}, ensure_ascii=False)}\n\n"
  state = await agent.aget_state(config)
  if state.next:
    for task in state.tasks:
      if task.interrupts:
        interrupt_value = task.interrupts[0].value
        yield f"data: {json.dumps({'type': 'approval_required', **interrupt_value}, ensure_ascii=False)}\n\n"
        return
  yield f"data: {json.dumps({'type': 'done'})}\n\n"

@router.post("")
async def handle_chat_stream(request: ChatRequest, db: AsyncSession = Depends(get_db),user:dict = Depends(get_current_user)):
  if request.model_config_id:
    model = await get_model_config(db,request.model_config_id)
    if not model:
      raise HTTPException(status_code=404,detail="模型配置不存在")
  else:
    model = await get_default_model_config(db)
    if not model:
      raise HTTPException(status_code=404,detail="默认模型配置不存在")
  
  agent = build_agent(model)
  thread_id = request.session_id or f"user-{user.get('user_id')}"
  return StreamingResponse(
    event_stream(agent, request.message, thread_id), 
    media_type="text/event-stream",
    headers={
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no"
    }
  )
    
class ApproveRequest(BaseModel):
    session_id: str  # 必传，要 resume 的会话
    approved: bool   # True 同意执行，False 拒绝


async def resume_event_stream(agent, approved: bool, thread_id: str):
    """审批后恢复执行的事件流"""
    config = {"configurable": {"thread_id": thread_id}}

    async for event in agent.astream_events(
        Command(resume=approved),
        config=config,
        version="v2",
    ):
        kind = event["event"]
        if kind == "on_chat_model_stream":
            chunk = event["data"]["chunk"]
            if chunk.content:
                yield f"data: {json.dumps({'type': 'token', 'content': chunk.content}, ensure_ascii=False)}\n\n"
        elif kind == "on_tool_start":
            yield f"data: {json.dumps({'type': 'tool_start', 'name': event['name']}, ensure_ascii=False)}\n\n"
        elif kind == "on_tool_end":
            output = str(event["data"].get("output", ""))
            yield f"data: {json.dumps({'type': 'tool_end', 'name': event['name'], 'output': output}, ensure_ascii=False)}\n\n"

    yield f"data: {json.dumps({'type': 'done'})}\n\n"


@router.post("/approve")
async def approve_command(
    req: ApproveRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    # 审批恢复也需要重建 agent（MemorySaver 全局单例保证状态共享）
    model_config = await get_default_model_config(db)
    if not model_config:
        raise HTTPException(status_code=400, detail="未配置默认模型")

    agent = build_agent(model_config)
    return StreamingResponse(
        resume_event_stream(agent, req.approved, req.session_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

class ApproveRequest(BaseModel):
    session_id: str  # 必传，要 resume 的会话
    approved: bool   # True 同意执行，False 拒绝
  
async def resume_event_stream(agent, approved: bool, thread_id: str):
    """审批后恢复执行的事件流"""
    config = {"configurable": {"thread_id": thread_id}}

    async for event in agent.astream_events(
        Command(resume=approved),
        config=config,
        version="v2",
    ):
      kind = event["event"]
      if kind == "on_chat_model_stream":
          chunk = event["data"]["chunk"]
          if chunk.content:
              yield f"data: {json.dumps({'type': 'token', 'content': chunk.content}, ensure_ascii=False)}\n\n"
      elif kind == "on_tool_start":
          yield f"data: {json.dumps({'type': 'tool_start', 'name': event['name']}, ensure_ascii=False)}\n\n"
      elif kind == "on_tool_end":
          output = str(event["data"].get("output", ""))
          yield f"data: {json.dumps({'type': 'tool_end', 'name': event['name'], 'output': output}, ensure_ascii=False)}\n\n"

    yield f"data: {json.dumps({'type': 'done'})}\n\n"
  
@router.post("/resume")
async def resume_command(
    req: ApproveRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    # 审批恢复也需要重建 agent（MemorySaver 全局单例保证状态共享）
    model_config = await get_default_model_config(db)
    if not model_config:
        raise HTTPException(status_code=400, detail="未配置默认模型")

    agent = build_agent(model_config)
    return StreamingResponse(
        resume_event_stream(agent, req.approved, req.session_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )