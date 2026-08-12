from fastapi import APIRouter,Depends,HTTPException,status,WebSocket,WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from config.database import get_db,async_session
from models.server import Server
from core.auth import get_current_user
from schemas.server import(
  ServerCreate,ServerUpdate,
  ServerOut,
  ServerGroupCreate,ServerGroupOut
)
from services.server import(
  create_server,get_servers,
  get_server,update_server,delete_server,
  create_group,get_groups,delete_group,
)
from core.ssh import execute_ssh_command,test_ssh_connection,execute_command_stream
from pydantic import BaseModel
import jwt
from config.settings import JWT_SECRET_KEY,JWT_ALGORITHM

router = APIRouter(prefix="/api/v1",dependencies=[Depends(get_current_user)])
ws_router = APIRouter(prefix="/api/v1")

@router.get("/server-groups",response_model = list[ServerGroupOut])
async def list_groups(db: AsyncSession = Depends(get_db)):
  return await get_groups(db)

@router.post("/server-groups",response_model = ServerGroupOut,status_code=status.HTTP_201_CREATED)
async def add_group(data: ServerGroupCreate,db: AsyncSession = Depends(get_db)):
  return await create_group(db,data)

@router.delete("/server-groups/{group_id}",status_code = status.HTTP_204_NO_CONTENT)
async def remove_group(group_id: int, db: AsyncSession = Depends(get_db)):
  if not await delete_group(db,group_id):
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="分组不存在")
  
@router.get("/servers",response_model = list[ServerOut])
async def list_servers(group_id: int | None = None, db: AsyncSession = Depends(get_db)):
  return await get_servers(db,group_id)

@router.get("/servers/{server_id}", response_model=ServerOut)
async def get_server_detail(server_id: int, db: AsyncSession = Depends(get_db)):
    server = await get_server(db, server_id)
    if not server:
        raise HTTPException(status_code=404, detail="服务器不存在")
    return server

@router.post("/servers",response_model=ServerOut,status_code=status.HTTP_201_CREATED)
async def add_server(data: ServerCreate,db: AsyncSession = Depends(get_db)):
  return await create_server(db,data)

@router.put("/servers/{server_id}",response_model=ServerOut)
async def handle_update_server(server_id: int, data: ServerUpdate,db: AsyncSession = Depends(get_db)):
  server = await get_server(db,server_id)
  if not server:
    raise HTTPException(status_code=404,detail="服务器不存在")
  return await update_server(db,server,data)
 
@router.delete("/servers/{server_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_server(server_id: int, db: AsyncSession = Depends(get_db)):
    if not await delete_server(db, server_id):
        raise HTTPException(status_code=404, detail="服务器不存在")
      
#ssh远程操作
@router.post("/servers/{server_id}/test-connection")
async def handle_test_connection(server_id: int, db: AsyncSession = Depends(get_db)):
  server = await get_server(db,server_id)
  if not server:
    raise HTTPException(status_code=404,detail="服务器不存在")
  success, msg = await test_ssh_connection(server)
  # 测试连接后更新状态
  server.status = "online" if success else "offline"
  await db.commit()
  return {"success": success, "msg": msg}
  
class ExecuteCommandRequest(BaseModel):
  command: str

@router.post("/servers/{server_id}/execute-command")
async def handle_execute_command(server_id: int, data: ExecuteCommandRequest, db: AsyncSession = Depends(get_db)):
  server = await get_server(db,server_id)
  if not server:
    raise HTTPException(status_code=404,detail="服务器不存在")
  try:
    result = await execute_ssh_command(server, data.command)
    return {"result": result}
  except Exception as e:
    raise HTTPException(status_code=500,detail=f"执行命令失败: {e}")
 
@ws_router.websocket("/ws/servers/{server_id}/terminal")
async def terminal_websocket(websocket: WebSocket, server_id: int):
  token = websocket.query_params.get("token")
  if not token:
    await websocket.close(code=4001)
    return
  try:
    jwt.decode(
      token,
      JWT_SECRET_KEY,
      algorithms=[JWT_ALGORITHM]
    )
  except jwt.InvalidTokenError:
    await websocket.close(code=4001)
    return

  await websocket.accept()

  async with async_session() as db:
    server = await get_server(db,server_id)
    if not server:
      await websocket.send_json({"type": "error", "data": "服务器不存在"})
      await websocket.close()
      return
    try:
      while True:
        data = await websocket.receive_json()
        command = data.get("command")
        if not command:
          continue

        async def send_output(msg_type,msg_data):
          await websocket.send_json({"type": msg_type, "data": msg_data})
        
        await execute_command_stream(server, command, send_output)
    except WebSocketDisconnect:
      pass
  

