from pydantic import BaseModel, Field
from typing import Optional, Literal
from enum import Enum

class TaskStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class SeparateRequest(BaseModel):
    input_path: str = Field(..., description="输入文件路径")
    output_dir: str = Field(..., description="输出目录")
    model: str = Field(default="htdemucs", description="Demucs模型名称")
    callback_url: Optional[str] = Field(default=None, description="进度回调URL")

class SeparateResponse(BaseModel):
    task_id: str
    status: TaskStatus
    message: str

class TaskStatusResponse(BaseModel):
    task_id: str
    status: TaskStatus
    progress: float = Field(default=0, description="进度0-100")
    stage: Optional[str] = Field(default=None, description="当前阶段")
    vocals_path: Optional[str] = None
    instrumental_path: Optional[str] = None
    error: Optional[str] = None
    created_at: float
    started_at: Optional[float] = None
    completed_at: Optional[float] = None

class HealthResponse(BaseModel):
    status: str = "ok"
    device: str = Field(..., description="cuda or cpu")
    ffmpeg_available: bool
    model_loaded: bool
    queue_size: int

class CallbackPayload(BaseModel):
    task_id: str
    status: TaskStatus
    progress: float
    stage: Optional[str] = None
    error: Optional[str] = None

class GpuInfoResponse(BaseModel):
    available: bool = Field(description="是否检测到 NVIDIA GPU")
    name: Optional[str] = Field(default=None, description="GPU 名称")
    memory_mb: Optional[int] = Field(default=None, description="GPU 显存(MB)")
    cuda_available: bool = Field(default=False, description="PyTorch CUDA 是否可用")
    torch_version: Optional[str] = Field(default=None, description="PyTorch 版本")
    torch_cuda_version: Optional[str] = Field(default=None, description="PyTorch CUDA 版本")
    venv_exists: bool = Field(default=False, description="venv 是否存在")

class InstallResponse(BaseModel):
    status: str
    message: str
