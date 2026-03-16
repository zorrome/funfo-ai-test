## 本地开发环境配置与启动说明

### 1. 前置依赖

- 安装 **Node.js 20+**（建议与 Dockerfile 保持一致）。
- 安装并启动 **Docker Desktop**（或任意带 docker daemon 的环境）。
- 确保命令行可用：
  - `docker version`
  - `docker compose version`

### 2. 配置 `.env`

1. 在项目根目录执行（或手动复制）：

   ```bash
   cp .env.example .env
   ```

2. 编辑 `.env`，重点填写以下变量（示例说明，按你本机实际调整）：

   - `HOST_PROJECT_ROOT`  
     - 说明：宿主机上 openclaw / AI 工作区的根目录，用来挂载生成的 app 代码与数据。  
     - 示例：`/Users/river/work/funfo/funfoai`

   - `DOCKER_SOCK_PATH`  
     - 说明：宿主机 Docker daemon 的 unix socket 路径，容器内通过它来创建/管理 app runtime 容器。  
     - 常见值：`/var/run/docker.sock`

   - `APP_IDLE_MINUTES` / `APP_IDLE_CHECK_MS`  
     - 说明：app 运行时空闲多久会被自动停机，以及检查间隔。默认值通常即可：
       - `APP_IDLE_MINUTES=30`
       - `APP_IDLE_CHECK_MS=300000`

   - `OPENCLAW_URL` / `OPENCLAW_TOKEN`  
     - 说明：外部 AI 服务（openclaw 或兼容接口）的地址与访问 token。  
     - 如果暂时没有真实服务：
       - 可以保留 `OPENCLAW_URL` 默认值；
       - `OPENCLAW_TOKEN` 保持占位字符串，不要提交到 git。

> `.env` 文件已在 `.gitignore` 中默认忽略，只在本地生效，不会被提交到仓库。

### 3. 安装依赖

在项目根目录执行一次：

```bash
npm install
```

### 4. 启动平台（前后端 + app runtime 管理）

使用 Docker Compose 一键启动：

```bash
docker compose up --build
```

- 首次运行会构建镜像并启动一个 `funfo-ai-store` 容器：
  - 后端 API：`3100` 端口
  - 前端（Vite）：`5175` 端口

### 5. 访问与验证

1. 打开浏览器访问前端：

   - `http://localhost:5175`

2. 在前端界面中：

   - 查看已有 app 列表；  
   - 点击某个 app 的预览 / 访问地址（形如 `/app/<slug>/`），确认 runtime 能被自动拉起并正常打开页面。

3. 如需停止服务：

```bash
docker compose down
```

### 6. 常见排查方向（简要）

- **容器无法访问 Docker daemon**  
  - 检查 `.env` 中的 `DOCKER_SOCK_PATH` 是否和宿主机实际路径一致；
  - 检查当前用户是否有访问 docker.sock 的权限。


