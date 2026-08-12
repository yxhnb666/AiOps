from cryptography.fernet import Fernet
from config.settings import ENCRYPTION_KEY
import base64
import hashlib

def _get_fernet() -> Fernet:
  key = hashlib.sha256(ENCRYPTION_KEY.encode()).digest()
  return Fernet(base64.urlsafe_b64encode(key))

def encrypt(plain_text: str) -> str:
  return _get_fernet().encrypt(plain_text.encode()).decode()

def decrypt(cipher_text: str) -> str:
  return _get_fernet().decrypt(cipher_text.encode()).decode()