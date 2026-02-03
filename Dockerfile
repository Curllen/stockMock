# 使用 1Panel 镜像源
FROM docker.1panel.live/library/python:3.10-slim

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set working directory
WORKDIR /app

# 配置 pip 使用国内镜像源
RUN pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libc6-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy all application files
COPY . .

# Create logs directory
RUN mkdir -p /app/logs

# Expose port
EXPOSE 5001

# Run with gunicorn (Reduced workers to 2 to save memory)
CMD ["gunicorn", "--workers", "2", "--bind", "0.0.0.0:5001", "--timeout", "120", "--log-level", "debug", "app:app"]
