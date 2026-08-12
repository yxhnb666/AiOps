import asyncssh
from core.crypto import decrypt
from models.server import Server

async def create_ssh_connection(server: Server) -> asyncssh.SSHClientConnection:
  password = decrypt(server.password) if server.password else None

  conn = await asyncssh.connect(
    host=server.ip,
    port=server.port,
    username=server.username,
    password=password if server.auth_type == "password" else None,
    client_keys=server.key_path if server.auth_type == "key" else None,
    known_hosts=None, 
  )
  return conn

async def test_ssh_connection(server: Server) -> tuple[bool, str]:
  try:
    conn = await create_ssh_connection(server)
    await conn.run("echo ok",check=True)
    conn.close()
    return True, "SSH 连接成功"
  except asyncssh.Error as e:
    return False, f"SSH 连接失败: {e}"
  except Exception as e:
    return False, f"SSH 连接失败: {e}"
  
async def execute_ssh_command(server: Server, command: str) -> str:
  conn = None
  try:
    conn = await create_ssh_connection(server)
    result = await conn.run(command,check=True)
    return result.stdout
  except asyncssh.Error as e:
    raise Exception(f"SSH 执行命令失败: {e}")
  except Exception as e:
    raise Exception(f"SSH 执行命令失败: {e}")
  finally:
    if conn is not None:
      conn.close()

async def execute_command_stream(server: Server, command: str, send_output):
  conn = None
  try:
    conn = await create_ssh_connection(server)
    result = await conn.run(command,check=True)
    if result.stdout:
      await send_output("stdout",result.stdout)
    if result.stderr:
      await send_output("stderr",result.stderr)
    await send_output("exit", str(result.exit_status))
  except asyncssh.Error as e:
      await send_output("error", f"SSH 错误: {e}")
  except Exception as e:
      await send_output("error", f"异常: {e}")
  finally:
      if conn is not None:
          conn.close()
