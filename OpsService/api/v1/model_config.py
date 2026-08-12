from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from config.database import get_db
from schemas.model_config import ModelConfigCreate, ModelConfigUpdate, ModelConfigOut
from services.model_config import (
    create_model_config,
    get_model_configs,
    get_model_config,
    update_model_config,
    delete_model_config,
)
from core.auth import get_current_user

router = APIRouter(prefix="/api/v1/model-configs", tags=["模型配置"],dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[ModelConfigOut])
async def list_model_configs(db: AsyncSession = Depends(get_db)):
    return await get_model_configs(db)


@router.post("", response_model=ModelConfigOut, status_code=status.HTTP_201_CREATED)
async def add_model_config(data: ModelConfigCreate, db: AsyncSession = Depends(get_db)):
    return await create_model_config(db, data)


@router.get("/{config_id}", response_model=ModelConfigOut)
async def get_model_config_detail(config_id: int, db: AsyncSession = Depends(get_db)):
    config = await get_model_config(db, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="模型配置不存在")
    return config


@router.put("/{config_id}", response_model=ModelConfigOut)
async def handle_update_model_config(config_id: int, data: ModelConfigUpdate, db: AsyncSession = Depends(get_db)):
    config = await get_model_config(db, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="模型配置不存在")
    return await update_model_config(db, config, data)


@router.delete("/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_model_config(config_id: int, db: AsyncSession = Depends(get_db)):
    if not await delete_model_config(db, config_id):
        raise HTTPException(status_code=404, detail="模型配置不存在")