from fastapi import HTTPException
from sqlalchemy import select,update
from sqlalchemy.ext.asyncio import AsyncSession
from models.model_config import ModelConfig
from schemas.model_config import ModelConfigCreate, ModelConfigUpdate
from core.crypto import encrypt,decrypt
from sqlalchemy.exc import NoResultFound, MultipleResultsFound
from utils.logger_handler import get_logger

logger = get_logger("model_config")

async def _clear_other_default(db: AsyncSession) -> None:
  await db.execute(
    update(ModelConfig).where(ModelConfig.is_default == True).
    values(is_default=False)
  )

async def create_model_config(db: AsyncSession, data: ModelConfigCreate) -> ModelConfig:
  model_config = ModelConfig(**data.model_dump())
  model_config.api_key = encrypt(model_config.api_key)
  if model_config.is_default:
    await _clear_other_default(db)
  db.add(model_config)
  await db.commit()
  await db.refresh(model_config)
  return model_config

async def get_default_model_config(db: AsyncSession) -> ModelConfig:
  logger.info("开始获取默认模型配置")
  result = await db.execute(select(ModelConfig).where(ModelConfig.is_default == True))
  try:
    return result.scalar_one()
  except NoResultFound:
    raise HTTPException(status_code=404, detail="默认模型配置不存在")
  except MultipleResultsFound:
    raise HTTPException(status_code=400, detail="存在多个默认模型配置")

async def get_model_configs(db: AsyncSession) -> list[ModelConfig]:
  result = await db.execute(select(ModelConfig).order_by(ModelConfig.created_at.desc()))
  return result.scalars().all()

async def get_model_config(db: AsyncSession, model_config_id: int) -> ModelConfig:
  model_config = await db.get(ModelConfig, model_config_id)
  if not model_config:
    raise HTTPException(status_code=404, detail="模型查询失败")
  return model_config

async def update_model_config(db: AsyncSession, config: ModelConfig, data: ModelConfigUpdate) -> ModelConfig:
    update_data = data.model_dump(exclude_unset=True)
    if "api_key" in update_data and update_data["api_key"]:
        update_data["api_key"] = encrypt(update_data["api_key"])
    if "is_default" in update_data and update_data["is_default"]:
        await _clear_other_default(db)
    for key, value in update_data.items():
        setattr(config, key, value)
    await db.commit()
    await db.refresh(config)
    return config
  
async def delete_model_config(db: AsyncSession, config_id: int) -> bool:
    config = await db.get(ModelConfig, config_id)
    if not config:
        return False
    await db.delete(config)
    await db.commit()
    return True
  
def get_decrypted_api_key(config: ModelConfig) -> str:
    """解密 api_key，供客户端工厂使用"""
    return decrypt(config.api_key)