import os
import re
import logging
from datetime import datetime
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.models import HealthResponse, SeparateRequest, SeparateResponse, TaskStatusResponse, GpuInfoResponse, InstallResponse
from app.worker import worker

# 手动加载项目根目录 .env 文件（不依赖 python-dotenv）
# 从本文件逐级向上查找，兼容本地（仓库根）与 Docker（/app）不同层级
_project_root = Path(__file__).resolve().parent
while (_project_root / '.env').exists() is False and _project_root.parent != _project_root:
    _project_root = _project_root.parent
_env_file = _project_root / '.env'
if _env_file.exists():
    with open(_env_file, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            match = re.match(r'^([A-Za-z_][A-Za-z0-9_]*)=(.*)$', line)
            if match:
                key, value = match.group(1), match.group(2).strip().strip('"').strip("'")
                os.environ.setdefault(key, value)

# HuggingFace 镜像源：未设置时自动使用国内镜像
if not os.environ.get('HF_ENDPOINT'):
    os.environ['HF_ENDPOINT'] = 'https://hf-mirror.com'

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MemoryLogHandler(logging.Handler):
    def __init__(self, max_size=500):
        super().__init__()
        self.max_size = max_size
        self.logs = []

    def emit(self, record):
        entry = {
            'timestamp': datetime.fromtimestamp(record.created).isoformat(),
            'level': record.levelname.lower(),
            'message': self.format(record),
            'logger': record.name,
        }
        self.logs.append(entry)
        if len(self.logs) > self.max_size:
            self.logs = self.logs[-self.max_size:]

memory_handler = MemoryLogHandler(max_size=2000)
memory_handler.setFormatter(logging.Formatter('%(message)s'))
logging.getLogger().addHandler(memory_handler)

# 全局状态
device = "cpu"
model_loaded = False

# 尝试导入可选模块（这些模块会在后续任务中创建）
try:
    from app.audio_utils import check_ffmpeg, get_ffmpeg_path, get_ffprobe_path
except ImportError:
    def check_ffmpeg() -> bool:
        return False
    def get_ffmpeg_path() -> str:
        return 'ffmpeg'
    def get_ffprobe_path() -> str:
        return 'ffprobe'

def detect_device():
    """检测GPU/CPU环境，兼容Docker

    优先级：
    1. 环境变量 SEPARATOR_DEVICE 强制指定（cpu / cuda / auto）
    2. 自动检测 CUDA 可用性
    Docker中若未挂载 GPU，CUDA不可用会自动降级到 CPU
    """
    global device
    forced = os.environ.get('SEPARATOR_DEVICE', 'auto').lower().strip()

    if forced == 'cpu':
        device = 'cpu'
        logger.info('SEPARATOR_DEVICE=cpu, using CPU')
        return

    if forced == 'cuda':
        try:
            import torch
            if torch.cuda.is_available():
                device = 'cuda'
                logger.info(f'SEPARATOR_DEVICE=cuda, GPU: {torch.cuda.get_device_name(0)}')
            else:
                device = 'cpu'
                logger.warning('SEPARATOR_DEVICE=cuda but CUDA unavailable, falling back to CPU')
        except ImportError:
            device = 'cpu'
            logger.warning('SEPARATOR_DEVICE=cuda but PyTorch not installed, using CPU')
        return

    # auto mode
    try:
        import torch
        if torch.cuda.is_available():
            device = 'cuda'
            logger.info(f'GPU detected: {torch.cuda.get_device_name(0)}')
        else:
            device = 'cpu'
            logger.info('No GPU detected, using CPU')
    except ImportError:
        device = 'cpu'
        logger.warning('PyTorch not installed, using CPU')

@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期"""
    logger.info("Starting NASKTV Separator Service...")
    detect_device()
    ffmpeg_path = get_ffmpeg_path()
    ffprobe_path = get_ffprobe_path()
    ffmpeg_ok = check_ffmpeg()
    logger.info(f"FFmpeg path: {ffmpeg_path}")
    logger.info(f"FFprobe path: {ffprobe_path}")
    logger.info(f"FFmpeg available: {ffmpeg_ok}")
    logger.info(f"HF_ENDPOINT: {os.environ.get('HF_ENDPOINT', '(not set)')}")
    worker.start()
    yield
    worker.stop()
    logger.info("Shutting down NASKTV Separator Service...")

app = FastAPI(
    title="NASKTV Separator",
    description="人声分离微服务 - 基于Demucs v4",
    version="0.1.0",
    lifespan=lifespan
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """健康检查"""
    try:
        from app.worker import worker
        queue_size = worker.get_queue_size()
    except ImportError:
        queue_size = 0
    return HealthResponse(
        device=device,
        ffmpeg_available=check_ffmpeg(),
        model_loaded=model_loaded,
        queue_size=queue_size
    )

@app.post("/api/separate", response_model=SeparateResponse)
async def create_separation_task(request: SeparateRequest):
    """创建分离任务"""
    if not os.path.exists(request.input_path):
        raise HTTPException(status_code=400, detail=f"Input file not found: {request.input_path}")

    task_id = worker.enqueue(
        input_path=request.input_path,
        output_dir=request.output_dir,
        model=request.model,
        callback_url=request.callback_url
    )

    return SeparateResponse(
        task_id=task_id,
        status="pending",
        message="Task created successfully"
    )

@app.get("/api/separate/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str):
    """查询任务状态"""
    status = worker.get_task(task_id)

    if not status:
        raise HTTPException(status_code=404, detail=f"Task not found: {task_id}")

    return status

@app.delete("/api/separate/{task_id}")
async def cancel_separation(task_id: str):
    success = worker.cancel_task(task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found or already in terminal state")
    return {"task_id": task_id, "status": "cancelled", "message": "Task cancelled by user"}

@app.post("/api/callback")
async def callback(request: dict):
    """进度回调接口（内部使用）"""
    logger.info(f"Callback received: {request}")
    return {"status": "ok"}

@app.get("/api/gpu/info", response_model=GpuInfoResponse)
async def gpu_info():
    from app.gpu_manager import get_gpu_info
    info = get_gpu_info()
    return info

@app.post("/api/gpu/install-gpu")
async def install_gpu(proxy: str = None):
    from fastapi.responses import StreamingResponse
    from app.gpu_manager import install_gpu_pytorch

    async def event_stream():
        async for line in install_gpu_pytorch(proxy):
            yield f"data: {line}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")

@app.post("/api/gpu/install-cpu")
async def install_cpu(proxy: str = None):
    from fastapi.responses import StreamingResponse
    from app.gpu_manager import uninstall_gpu_pytorch

    async def event_stream():
        async for line in uninstall_gpu_pytorch(proxy):
            yield f"data: {line}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")

@app.get("/api/logs")
async def get_logs(level: str = None, limit: int = 100):
    logs = memory_handler.logs
    if level:
        level_order = {'debug': 10, 'info': 20, 'warning': 30, 'error': 40}
        min_level = level_order.get(level.lower(), 0)
        level_map = {'debug': 10, 'info': 20, 'warning': 30, 'error': 40, 'critical': 50}
        logs = [l for l in logs if level_map.get(l['level'], 0) >= min_level]
    return {"logs": logs[-limit:]}
