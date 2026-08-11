FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    ffmpeg \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml requirements.txt ./
COPY app/ ./app/

RUN pip install --no-cache-dir torch torchaudio --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

RUN mkdir -p /app/cache /app/data

ENV TORCH_HOME=/app/cache
ENV DEMUCS_CACHE=/app/cache
ENV HF_ENDPOINT=https://hf-mirror.com

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/api/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
