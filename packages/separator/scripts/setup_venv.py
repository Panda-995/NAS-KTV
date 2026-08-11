import os
import sys
import subprocess
import shutil
import platform

IS_WINDOWS = platform.system() == 'Windows'
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SEPARATOR_DIR = os.path.dirname(SCRIPT_DIR)
VENV_DIR = os.path.join(SEPARATOR_DIR, '.venv')

PYPI_INDEX_URL = os.environ.get('PIP_INDEX_URL') or 'https://pypi.tuna.tsinghua.edu.cn/simple'
PYPI_TRUSTED_HOST = 'pypi.tuna.tsinghua.edu.cn'
PYTORCH_INDEX_URL = os.environ.get('PYTORCH_INDEX_URL') or 'https://download.pytorch.org/whl/cu124'

def get_venv_python():
    if IS_WINDOWS:
        return os.path.join(VENV_DIR, 'Scripts', 'python.exe')
    return os.path.join(VENV_DIR, 'bin', 'python')

def find_uv():
    uv = shutil.which('uv')
    if uv:
        return uv
    raise FileNotFoundError('uv not found. Install: https://docs.astral.sh/uv/')

def run_uv(*args, check=True):
    uv = find_uv()
    cmd = [uv] + list(args)
    print(f'  > {" ".join(cmd)}')
    return subprocess.run(cmd, check=check, cwd=SEPARATOR_DIR)

def run_uv_stream(*args):
    uv = find_uv()
    cmd = [uv] + list(args)
    print(f'  > {" ".join(cmd)}')
    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding='utf-8',
        errors='replace',
        cwd=SEPARATOR_DIR,
    )
    for line in iter(process.stdout.readline, ''):
        print(f'  {line}', end='')
    process.wait()
    return process.returncode

def create_venv():
    if os.path.exists(get_venv_python()):
        print(f'[setup] venv already exists at {VENV_DIR}')
        return
    print(f'[setup] Creating venv at {VENV_DIR} ...')
    run_uv('venv', VENV_DIR, '--python', '3.12')
    print('[setup] venv created.')

def install_base_deps():
    req_file = os.path.join(SEPARATOR_DIR, 'requirements.txt')
    print(f'[setup] Installing dependencies from {req_file} ...')
    print(f'[setup] Using mirror: {PYPI_INDEX_URL}')
    run_uv('pip', 'install',
        '--python', get_venv_python(),
        '-r', req_file,
        '--index-url', PYPI_INDEX_URL,
        '--trusted-host', PYPI_TRUSTED_HOST,
    )
    print('[setup] Dependencies installed.')

def detect_gpu():
    nvidia_smi = shutil.which('nvidia-smi')
    if not nvidia_smi:
        return []
    try:
        result = subprocess.run(
            [nvidia_smi, '--query-gpu=name,memory.total', '--format=csv,noheader,nounits'],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0 and result.stdout.strip():
            gpus = []
            for line in result.stdout.strip().split('\n'):
                if not line.strip():
                    continue
                parts = [p.strip() for p in line.split(',')]
                if len(parts) >= 2:
                    gpus.append({'name': parts[0], 'memory_mb': int(parts[1]) if parts[1].isdigit() else 0})
            return gpus
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    return []

def install_gpu_pytorch():
    print('[setup] Installing GPU-enabled PyTorch (CUDA 12.4) ...')
    print('[setup] This may take several minutes depending on network speed.')
    print(f'[setup] PyTorch index: {PYTORCH_INDEX_URL}')
    print(f'[setup] Fallback mirror: {PYPI_INDEX_URL}')
    print('')
    rc = run_uv_stream('pip', 'install',
        '--python', get_venv_python(),
        '--force-reinstall',
        'torch', 'torchaudio',
        '--index-url', PYTORCH_INDEX_URL,
    )
    if rc != 0:
        print(f'\n[setup] GPU PyTorch installation failed (exit code {rc})')
        return False
    print('\n[setup] GPU PyTorch installed.')
    return True

def verify_installation():
    python = get_venv_python()
    print('[setup] Verifying installation ...')
    result = subprocess.run(
        [python, '-c', 'import torch; print(f"PyTorch {torch.__version__}, CUDA: {torch.cuda.is_available()}")'],
        capture_output=True, text=True
    )
    if result.returncode == 0:
        print(f'[setup] {result.stdout.strip()}')
    else:
        print(f'[setup] Warning: Could not verify PyTorch: {result.stderr.strip()}')

    result = subprocess.run(
        [python, '-c', 'import demucs; print("Demucs OK")'],
        capture_output=True, text=True
    )
    if result.returncode == 0:
        print(f'[setup] {result.stdout.strip()}')
    else:
        print(f'[setup] Warning: Could not verify Demucs: {result.stderr.strip()}')

def main():
    print('=' * 50)
    print('NASKTV Separator - Venv Setup')
    print('=' * 50)

    create_venv()
    install_base_deps()

    gpus = detect_gpu()
    if gpus:
        print(f'\n[setup] Detected GPU: {gpus[0]["name"]}')
        install_gpu_pytorch()
    else:
        print('\n[setup] No NVIDIA GPU detected, using CPU PyTorch.')

    verify_installation()

    print('\n' + '=' * 50)
    print('Setup complete!')
    print(f'Venv: {VENV_DIR}')
    print(f'Python: {get_venv_python()}')
    print('=' * 50)

if __name__ == '__main__':
    main()
