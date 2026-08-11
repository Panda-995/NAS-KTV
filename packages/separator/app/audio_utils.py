import os
import subprocess
import platform
import logging
from typing import Optional

logger = logging.getLogger(__name__)

_is_windows = platform.system() == 'Windows'

def get_ffmpeg_path() -> str:
    return os.environ.get('FFMPEG_PATH', 'ffmpeg')

def get_ffprobe_path() -> str:
    base = os.environ.get('FFMPEG_PATH', '')
    if not base or base == 'ffmpeg':
        return 'ffprobe'
    if os.path.isdir(base):
        return os.path.join(base, 'ffprobe.exe' if _is_windows else 'ffprobe')
    if os.path.isfile(base):
        ffmpeg_dir = os.path.dirname(base)
        ffprobe_name = 'ffprobe.exe' if _is_windows else 'ffprobe'
        ffprobe_path = os.path.join(ffmpeg_dir, ffprobe_name)
        if os.path.isfile(ffprobe_path):
            return ffprobe_path
    return 'ffprobe'

_FFMPEG_NOT_FOUND_MSG = (
    "ffmpeg not found. Please install ffmpeg or set FFMPEG_PATH env variable. "
    "Install: https://ffmpeg.org/download.html or run 'choco install ffmpeg'"
)

def _run_command(command: list[str], timeout: Optional[int] = None) -> subprocess.CompletedProcess:
    try:
        if _is_windows:
            kwargs: dict = {
                'stdout': subprocess.PIPE,
                'stderr': subprocess.PIPE,
                'encoding': 'utf-8',
            }
            process = subprocess.Popen(command, **kwargs)
            try:
                stdout, stderr = process.communicate(timeout=timeout)
            except subprocess.TimeoutExpired:
                process.kill()
                process.communicate()
                raise
            return subprocess.CompletedProcess(command, process.returncode, stdout, stderr)
        else:
            return subprocess.run(command, capture_output=True, text=True, timeout=timeout)
    except FileNotFoundError:
        raise FileNotFoundError(_FFMPEG_NOT_FOUND_MSG)

def check_ffmpeg() -> bool:
    try:
        result = _run_command([get_ffmpeg_path(), '-version'], timeout=5)
        return result.returncode == 0
    except (subprocess.SubprocessError, FileNotFoundError):
        return False

def extract_audio(video_path: str, output_path: str) -> str:
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found: {video_path}")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    command = [
        get_ffmpeg_path(), '-y',
        '-i', video_path,
        '-vn',
        '-acodec', 'pcm_s16le',
        '-ar', '44100',
        '-ac', '2',
        output_path
    ]

    logger.info(f"Extracting audio from {video_path} to {output_path}")
    result = _run_command(command)

    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg audio extraction failed: {result.stderr}")

    logger.info("Audio extraction completed")
    return output_path

def transcode_to_mp3(input_path: str, output_path: str, bitrate: int = 128) -> str:
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    command = [
        get_ffmpeg_path(), '-y',
        '-i', input_path,
        '-codec:a', 'libmp3lame',
        '-b:a', f'{bitrate}k',
        output_path
    ]

    logger.info(f"Transcoding {input_path} to MP3 ({bitrate}kbps)")
    result = _run_command(command)

    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg MP3 transcoding failed: {result.stderr}")

    logger.info("MP3 transcoding completed")
    return output_path

def get_audio_info(file_path: str) -> dict:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    command = [
        get_ffprobe_path(),
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        file_path
    ]

    result = _run_command(command)

    if result.returncode != 0:
        raise RuntimeError(f"FFprobe failed: {result.stderr}")

    import json
    info = json.loads(result.stdout)

    format_info = info.get('format', {})
    streams = info.get('streams', [])
    audio_stream = next((s for s in streams if s.get('codec_type') == 'audio'), {})

    return {
        'duration': float(format_info.get('duration', 0)),
        'bitrate': int(format_info.get('bit_rate', 0)),
        'sample_rate': int(audio_stream.get('sample_rate', 0)),
        'channels': int(audio_stream.get('channels', 0)),
        'codec': audio_stream.get('codec_name', ''),
        'size': int(format_info.get('size', 0))
    }

def is_video_file(file_path: str) -> bool:
    video_extensions = {'.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm'}
    ext = os.path.splitext(file_path)[1].lower()
    return ext in video_extensions

def is_audio_file(file_path: str) -> bool:
    audio_extensions = {'.mp3', '.flac', '.m4a', '.wav', '.aac', '.ogg', '.wma'}
    ext = os.path.splitext(file_path)[1].lower()
    return ext in audio_extensions
