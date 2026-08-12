from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models.server import Server, ServerGroup
from schemas.server import ServerCreate, ServerUpdate, ServerGroupCreate
from core.crypto import encrypt

async def create_group(db:AsyncSession, data:ServerGroupCreate) -> ServerGroup:
  group = ServerGroup(**data.model_dump())
  db.add(group)
  await db.commit()
  await db.refresh(group)
  return group

async def get_groups(db:AsyncSession) -> list[ServerGroup]:
  groups = await db.execute(select(ServerGroup))
  return groups.scalars().all()

async def delete_group(db: AsyncSession, group_id: int) -> bool:
    group = await db.get(ServerGroup, group_id)
    if not group:
        return False
    await db.delete(group)
    await db.commit()
    return True

async def create_server(db: AsyncSession,data: ServerCreate) -> Server:
  server = Server(**data.model_dump())
  if server.password:
    server.password = encrypt(server.password)
  db.add(server)
  await db.commit()
  await db.refresh(server)
  return server

async def get_servers(db: AsyncSession, group_id: int | None = None) -> list[Server]:
  stmt = select(Server)
  if group_id is not None:
    stmt = stmt.where(Server.group_id == group_id)
  result = await db.execute(stmt)
  return result.scalars().all()


async def get_server(db: AsyncSession, server_id: int) -> Server | None:
  server = await db.get(Server, server_id)
  if not server:
    return None
  return server

async def update_server(db: AsyncSession, server: Server, data: ServerUpdate) -> Server:
  update_data = data.model_dump(exclude_unset=True)
  if "password" in update_data and update_data["password"]:
    update_data["password"] = encrypt(update_data["password"])
  for key, value in update_data.items():
    setattr(server, key, value)
  await db.commit()
  await db.refresh(server)
  return server

async def delete_server(db: AsyncSession, server_id: int) -> bool:
    server = await db.get(Server, server_id)
    if not server:
        return False
    await db.delete(server)
    await db.commit()
    return True