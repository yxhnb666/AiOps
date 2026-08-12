"""统一日志配置。

用法：
    from utils.logger_handler import logger
    logger.info("服务启动")
    logger.error("出错了", exc_info=True)   # exc_info=True 自动记录异常堆栈

或按模块获取独立命名的 logger（共享同一套 handler 配置）：
    from utils.logger_handler import get_logger
    logger = get_logger("knowledge")
"""
import logging
import os
import sys
from logging.handlers import RotatingFileHandler

# 日志级别：从环境变量读，默认 INFO
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

# 日志文件目录：OpsService/logs/
_LOG_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "logs"
)
os.makedirs(_LOG_DIR, exist_ok=True)

_LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s:%(lineno)d | %(message)s"
_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def _build_logger() -> logging.Logger:
    """构建并返回主 logger 实例（带控制台 + 文件轮转 handler）。"""
    logger = logging.getLogger("ops")
    logger.setLevel(LOG_LEVEL)
    logger.propagate = False  # 不向 root logger 传播，避免重复输出

    if logger.handlers:  # 防止重复添加（热重载场景）
        return logger

    formatter = logging.Formatter(_LOG_FORMAT, _DATE_FORMAT)

    # 1) 控制台输出
    console = logging.StreamHandler(sys.stdout)
    console.setLevel(LOG_LEVEL)
    console.setFormatter(formatter)
    logger.addHandler(console)

    # 2) 文件输出（按大小轮转：单个 10MB，保留 5 个备份）
    file_handler = RotatingFileHandler(
        os.path.join(_LOG_DIR, "ops.log"),
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setLevel(LOG_LEVEL)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    # 3) 抑制第三方库过于啰嗦的日志
    # SQLAlchemy engine 默认会把每条 SQL 打到 INFO，刷屏，降级到 WARNING
    logging.getLogger("sqlalchemy.engine").setLevel("WARNING")
    # aiosqlite / asyncio 调试噪音
    logging.getLogger("asyncio").setLevel("WARNING")

    return logger


def get_logger(name: str) -> logging.Logger:
    """获取带模块前缀的子 logger（共享 ops 的 handler 配置）。

    例：get_logger("knowledge") -> logger 名 "ops.knowledge"
    """
    return logging.getLogger(f"ops.{name}")


# 模块导入即就绪，外部直接 from utils.logger_handler import logger
logger = _build_logger()
