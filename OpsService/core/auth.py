from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from config.settings import JWT_SECRET_KEY, JWT_ALGORITHM
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
  try:
    payload = jwt.decode(
      credentials.credentials,
      JWT_SECRET_KEY,
      algorithms=[JWT_ALGORITHM]
    )
    return payload
  except jwt.ExpiredSignatureError:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token 已过期")
  except jwt.InvalidTokenError:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="无效的 Token")