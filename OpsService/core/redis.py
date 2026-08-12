import redis.asyncio as redis
from config.settings import REDIS_URL
from langgraph.checkpoint.redis import AsyncRedisSaver

_checkpointer: AsyncRedisSaver | None = None

_redis_client:redis.Redis | None = None

async def get_redis() -> redis.Redis:
  global _redis_client
  if _redis_client is None:
    _redis_client = redis.from_url(
      REDIS_URL,
      decode_responses=True,
    )
  return _redis_client

async def init_checkpointer() -> None:
  global _checkpointer
  if _checkpointer is None:
    _checkpointer = AsyncRedisSaver(redis_url = REDIS_URL)
    await _checkpointer.asetup()


def get_checkpointer() -> AsyncRedisSaver:
  """同步获取已初始化的 Checkpointer 单例。
  
  必须在 init_checkpointer() 完成后调用，否则抛出 RuntimeError。
  """
  global _checkpointer
  if _checkpointer is None:
    raise RuntimeError("Checkpointer 未初始化，请在应用启动时调用 init_checkpointer()")
  return _checkpointer

async def close_redis():
  global _redis_client, _checkpointer
  if _redis_client is not None:
    await _redis_client.close()
    _redis_client = None
  if _checkpointer is not None:
    await _checkpointer.aclose()
    _checkpointer = None