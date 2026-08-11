// 启动 dev 前清理所有服务端口，避免端口占用导致 tv-app (strictPort) 启动失败
const { execSync } = require('child_process');
const os = require('os');

const PORTS = [3000, 5173, 5174, 1420, 8001, 8080];

function killPorts() {
  const platform = os.platform();
  let killed = [];

  try {
    if (platform === 'win32') {
      // Windows: 查找并终止占用端口的进程
      const result = execSync('netstat -ano', { encoding: 'utf8' });
      const lines = result.split('\n');
      const pidSet = new Set();

      for (const line of lines) {
        const trimmed = line.trim();
        for (const port of PORTS) {
          // 匹配 LISTENING 状态的端口
          if (trimmed.match(new RegExp(`:${port}\\s.*LISTENING`))) {
            const parts = trimmed.split(/\s+/).filter(Boolean);
            const pid = parts[parts.length - 1];
            if (pid && pid !== '0' && /^\d+$/.test(pid)) {
              pidSet.add(pid);
            }
          }
        }
      }

      for (const pid of pidSet) {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
          killed.push(pid);
        } catch {
          // 进程可能已退出
        }
      }
    } else {
      // Linux/macOS: 使用 fuser 或 lsof
      for (const port of PORTS) {
        try {
          const pids = execSync(`lsof -t -i:${port} 2>/dev/null`, { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
          for (const pid of pids) {
            try {
              process.kill(parseInt(pid), 'SIGKILL');
              killed.push(pid);
            } catch {}
          }
        } catch {}
      }
    }
  } catch (e) {
    // netstat 或命令执行失败时忽略，继续启动
  }

  if (killed.length > 0) {
    console.log(`[kill-ports] 已清理 ${killed.length} 个占用进程: ${killed.join(', ')}`);
  } else {
    console.log('[kill-ports] 端口空闲，无需清理');
  }
}

killPorts();
