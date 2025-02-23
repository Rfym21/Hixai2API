## 安装与运行

### 使用 Docker 运行

1. 使用 Docker 命令：

   ```bash
   docker run -d -p 8999:8999 --name hixai2api rfym21/hixai2api:latest
   ```

2. 使用 docker-compose 运行服务：

   ```bash
   curl -o docker-compose.yml https://raw.githubusercontent.com/Rfym21/Hixai2API/refs/heads/main/docker-compose.yml
   docker compose pull && docker compose up -d
   ```

### 本地运行

2. 下载仓库文件：

   ```bash
   git clone https://github.com/Rfym21/Hixai2API
   cd Hixai2API
   ```

2. 安装依赖：

   ```bash
   npm install
   ```
## API 端点

### 获取模型列表

- **请求方式**: `GET`
- **URL**: `/v1/models`

### 聊天完成

- **请求方式**: `POST`
- **URL**: `/v1/chat/completions`
- **Headers**:
  - `Authorization`: 必须提供有效的授权令牌。
- **请求体**:

  ```json
  {
    "model": "模型名称",
    "messages": [
      {
        "role": "user",
        "content": "用户消息"
      }
    ],
    "stream": false
  }
  ```