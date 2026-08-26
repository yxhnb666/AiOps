"""SSH 指标采集器。一次 SSH 调用采完所有指标，每项独立解析，单项失败不影响整体。"""
import re
import time
from models.server import Server
from models.metric import ServerMetric
from core.ssh import create_ssh_connection

_COLLECT_COMMAND = """echo "===CPU==="
top -bn1 | grep "Cpu(s)" | awk -F',' '{print $4}' | awk '{print 100 - $1}'
echo "===LOAD==="
cat /proc/loadavg
echo "===MEM==="
free -m | grep "Mem:"
echo "===DISK==="
df -m / | tail -1
echo "===NET==="
cat /proc/net/dev | grep -E "eth0|ens|eno|enp" | head -1
echo "===UPTIME==="
awk '{print int($1)}' /proc/uptime
echo "===END==="
"""

# 内存缓存：{server_id: (last_rx_bytes, last_tx_bytes, last_ts)}
_last_net_state: dict[int, tuple[float, float, float]] = {}

def _parse_section(raw: str, start: str, end: str) -> str | None:
    pattern = rf"{start}\n(.*?)\n{end}"
    m = re.search(pattern, raw, re.DOTALL)
    return m.group(1).strip() if m else None

def _parse_cpu(text: str | None) -> float | None:
    if not text:
        return None
    try:
        return round(float(text.strip()), 2)
    except (ValueError, AttributeError):
        return None

def _parse_load(text: str | None) -> tuple[float | None, float | None, float | None]:
    if not text:
        return None, None, None
    try:
        parts = text.split()
        return float(parts[0]), float(parts[1]), float(parts[2])
    except (ValueError, IndexError):
        return None, None, None

def _parse_memory(text: str | None) -> tuple[float | None, float | None, float | None]:
    if not text:
        return None, None, None
    try:
        parts = text.split()
        # free -m: "Mem: total used free shared buff/cache available"
        total = float(parts[1])
        used = float(parts[2])
        usage = round((used / total) * 100, 2) if total > 0 else None
        return total, used, usage
    except (ValueError, IndexError):
        return None, None, None

def _parse_disk(text: str | None) -> tuple[float | None, float | None, float | None]:
    if not text:
        return None, None, None
    try:
        parts = text.split()
        # df -m: "/dev/sda1 20480 10240 10240 50% /"
        total = float(parts[1])
        used = float(parts[2])
        usage = float(parts[4].rstrip("%"))
        return total, used, usage
    except (ValueError, IndexError):
        return None, None, None

def _parse_net(text: str | None, server_id: int) -> tuple[float | None, float | None]:
    """返回 (net_in_kbps, net_out_kbps)。速率 = 字节差 / 间隔 / 1024。"""
    if not text:
        return None, None
    try:
        parts = text.split()
        rx_bytes = float(parts[1])
        tx_bytes = float(parts[9])
        now = time.time()
        last = _last_net_state.get(server_id)
        if last is None:
            net_in, net_out = None, None
        else:
            last_rx, last_tx, last_ts = last
            delta = now - last_ts
            if delta <= 0:
                net_in, net_out = None, None
            else:
                net_in = round((rx_bytes - last_rx) / delta / 1024, 2) if rx_bytes >= last_rx else 0.0
                net_out = round((tx_bytes - last_tx) / delta / 1024, 2) if tx_bytes >= last_tx else 0.0
        _last_net_state[server_id] = (rx_bytes, tx_bytes, now)
        return net_in, net_out
    except (ValueError, IndexError):
        return None, None

def _parse_uptime(text: str | None) -> float | None:
    if not text:
        return None
    try:
        return float(text.strip())
    except (ValueError, AttributeError):
        return None

async def collect_metrics(server: Server) -> ServerMetric | None:
    """对单台服务器执行一次采集。返回未持久化的 ServerMetric，失败返回 None。"""
    conn = None
    try:
        conn = await create_ssh_connection(server)
        result = await conn.run(_COLLECT_COMMAND, check=True, timeout=15)
        raw = result.stdout

        cpu_text = _parse_section(raw, "===CPU===", "===LOAD===")
        load_text = _parse_section(raw, "===LOAD===", "===MEM===")
        mem_text = _parse_section(raw, "===MEM===", "===DISK===")
        disk_text = _parse_section(raw, "===DISK===", "===NET===")
        net_text = _parse_section(raw, "===NET===", "===UPTIME===")
        uptime_text = _parse_section(raw, "===UPTIME===", "===END===")

        cpu_usage = _parse_cpu(cpu_text)
        load1, load5, load15 = _parse_load(load_text)
        mem_total, mem_used, mem_usage = _parse_memory(mem_text)
        disk_total, disk_used, disk_usage = _parse_disk(disk_text)
        net_in, net_out = _parse_net(net_text, server.id)
        uptime = _parse_uptime(uptime_text)

        return ServerMetric(
            server_id=server.id,
            cpu_usage=cpu_usage,
            cpu_load1=load1, cpu_load5=load5, cpu_load15=load15,
            mem_total=mem_total, mem_used=mem_used, mem_usage=mem_usage,
            disk_total=disk_total, disk_used=disk_used, disk_usage=disk_usage,
            net_in=net_in, net_out=net_out,
            uptime=uptime,
        )
    except Exception:
        return None
    finally:
        if conn is not None:
            conn.close()

async def collect_and_persist(server: Server, db) -> ServerMetric | None:
    """采集 + 写入数据库。供 scheduler 调用。"""
    metric = await collect_metrics(server)
    if metric is None:
        server.status = "offline"
        await db.commit()
        return None
    server.status = "online"
    db.add(metric)
    await db.commit()
    return metric