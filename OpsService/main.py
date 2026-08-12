from contextlib import asynccontextmanager
from fastapi import FastAPI
from config.database import create_db
from api.v1.routers import router,ws_router
from api.v1.model_config import router as model_config_router
from api.v1.chat import router as chat_router
from api.v1.knowledge import router as knowledge_router
from fastapi.middleware.cors import CORSMiddleware
from core.redis import close_redis, init_checkpointer


@asynccontextmanager
async def lifespan(app: FastAPI):
  await create_db()
  await init_checkpointer()
  yield
  await close_redis()

app = FastAPI(title="OpsService", lifespan=lifespan)
app.include_router(router)
app.include_router(ws_router)
app.include_router(model_config_router)
app.include_router(chat_router)
app.include_router(knowledge_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.get("/health")
async def health():
  return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)