# Docker 部署快速指南

本文档提供使用 Docker 部署股票倍投模拟器的快速指南。

## 📦 文件说明

项目包含以下 Docker 相关文件：
- `Dockerfile` - Docker 镜像构建文件
- `docker-compose.yml` - Docker Compose 编排文件
- `.dockerignore` - Docker 构建排除文件

## 🚀 快速开始

### 方式一：使用 Docker Compose（推荐）

1. **启动服务**
```bash
docker-compose up -d
```

2. **查看日志**
```bash
docker-compose logs -f
```

3. **停止服务**
```bash
docker-compose down
```

### 方式二：使用 Docker 命令

1. **构建镜像**
```bash
docker build -t stock-simulator .
```

2. **运行容器**
```bash
docker run -d \
  --name stock-simulator \
  -p 5001:5001 \
  -v $(pwd)/logs:/app/logs \
  stock-simulator
```

3. **查看日志**
```bash
docker logs -f stock-simulator
```

4. **停止容器**
```bash
docker stop stock-simulator
docker rm stock-simulator
```

## 🔧 配置说明

### Dockerfile 特性
- 基于 `python:3.10-slim` 轻量级镜像
- 使用 Gunicorn 作为 WSGI 服务器（4个工作进程）
- 内置健康检查
- 日志输出到 `/app/logs` 目录

### docker-compose.yml 配置
- 端口映射：`5001:5001`
- 自动重启：`restart: always`
- 日志卷挂载：`./logs:/app/logs`
- 时区设置：`Asia/Shanghai`

## 📊 访问应用

容器启动后，访问：
```
http://localhost:5001
```

## 🛠 常用命令

### 查看运行状态
```bash
docker-compose ps
```

### 重启服务
```bash
docker-compose restart
```

### 查看资源使用
```bash
docker stats stock-simulator
```

### 进入容器
```bash
docker exec -it stock-simulator /bin/bash
```

### 更新应用
```bash
# 重新构建并启动
docker-compose up -d --build
```

## 🔍 故障排查

### 查看容器日志
```bash
docker-compose logs --tail=100 -f
```

### 检查健康状态
```bash
docker inspect --format='{{json .State.Health}}' stock-simulator
```

### 清理资源
```bash
# 停止并删除容器
docker-compose down

# 删除镜像
docker rmi stock-simulator

# 清理未使用的资源
docker system prune -a
```

## 🌐 生产环境部署

### 使用 Nginx 反向代理

创建 `nginx.conf`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://stock-simulator:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

更新 `docker-compose.yml`:
```yaml
version: '3.8'

services:
  stock-simulator:
    build: .
    expose:
      - "5001"
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - stock-simulator
```

## 📝 注意事项

1. 确保 Docker 和 Docker Compose 已安装
2. 首次构建可能需要几分钟下载依赖
3. 日志文件会保存在 `./logs` 目录
4. 容器会自动重启（除非手动停止）
5. 健康检查每30秒执行一次

## 🔗 相关链接

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [完整部署指南](deployment_guide.md)
