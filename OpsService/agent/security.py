import re

# 高危命令规则：(正则, 风险描述)
# 说明：宁可多拦一次（让用户点确认），不要放过一次 rm -f 之类的误删
DANGEROUS_PATTERNS = [
    # --- rm 删除相关（拆分多组，避免只拦 -rf）---
    (r"\brm\s+.*-[a-zA-Z]*f\b", "强制删除（rm -f），目标不存在也不报错，容易误删"),
    (r"\brm\s+.*-[a-zA-Z]*[rR]\b", "递归删除目录（rm -r/-R），会删除子目录所有内容"),
    (r"\brm\s+[^\n]*\*", "使用通配符删除（rm *），可能误删超出预期的文件"),
    (r"\brm\s+[^\n]*/\s*$", "删除根目录（rm /），极度危险"),
    (r"\brm\s+-[a-zA-Z]*[a-zA-Z]*/[a-zA-Z]*", "删除根下路径（rm /* 等），极度危险"),

    # --- 文件系统 / 磁盘 ---
    (r"\bmkfs\.\w+\b", "格式化文件系统"),
    (r"\bdd\b\s+if=", "磁盘镜像写入（dd if=... of=...）"),
    (r">\s*/dev/sd[a-z]", "直接写入磁盘设备"),
    (r">\s*/dev/nvme", "直接写入 NVMe 磁盘设备"),

    # --- 系统关机/重启 ---
    (r"\bshutdown\b", "关机"),
    (r"\breboot\b", "重启"),
    (r"\bhalt\b", "停机"),
    (r"\bpoweroff\b", "关机"),
    (r"\binit\s+[06]\b", "切换运行级别到关机/重启"),

    # --- 服务管理（停止/禁用/重启关键服务）---
    (r"\bsystemctl\s+stop\b", "停止系统服务（systemctl stop），可能导致业务中断"),
    (r"\bsystemctl\s+disable\b", "禁用系统服务（systemctl disable），服务将无法开机自启"),
    (r"\bsystemctl\s+restart\b", "重启系统服务（systemctl restart），会导致服务短暂中断"),
    (r"\bservice\s+\S+\s+stop\b", "停止系统服务（service stop），可能导致业务中断"),
    (r"\bservice\s+\S+\s+restart\b", "重启系统服务（service restart），会导致服务短暂中断"),
    (r"\b/etc/init\.d/\S+\s+stop\b", "停止系统服务（init.d stop），可能导致业务中断"),

    # --- 进程管理 ---
    (r"\bkill\b", "终止进程（kill），可能导致服务异常"),
    (r"\bkillall\b", "批量终止同名进程（killall）"),
    (r"\bpkill\b", "按名称批量终止进程（pkill）"),
    (r"\bkill\s+-9\b", "强制终止进程（kill -9），进程无法正常清理资源"),

    # --- 网络配置变更 ---
    (r"\biptables\s+-F\b", "清空防火墙规则（iptables -F），可能导致安全策略失效"),
    (r"\bifconfig\s+\S+\s+down\b", "关闭网络接口"),
    (r"\bip\s+link\s+set\s+\S+\s+down\b", "关闭网络接口"),

    # --- 恶意命令 ---
    (r":\(\)\s*\{.*\};", "fork 炸弹"),
    (r"\bchmod\s+-R\s+0*777\b", "递归开放全部权限（chmod -R 777）"),
    (r"\bchown\s+-R\s+\S+:\S+\s+/", "递归修改 / 下所有文件归属"),
]


def check_command_risk(command: str) -> tuple[bool, str]:
    """检查命令是否高危。
    支持用分号/管道/&& 串联的多命令，逐段检查。
    Returns:
        (is_dangerous, reason)  reason 在非高危时为空字符串
    """
    # 拆成独立命令片段：按 ; && || | 拆分
    segments = re.split(r";|\&\&|\|\||\|", command)
    for seg in segments:
        seg = seg.strip()
        if not seg:
            continue
        for pattern, desc in DANGEROUS_PATTERNS:
            if re.search(pattern, seg):
                return True, desc
    return False, ""