```markdown
Render — 无数据库运行说明 (NO_DB=1)

场景
- 你想在 Render 上快速部署或演示应用，但暂时不想/无法连接到 PostgreSQL。

做法
1. 在 Render 控制台进入你的 Web Service。
2. 打开 Environment（环境变量）设置，新增一对环境变量：
   - `NO_DB=1`
   - 可选：保留 `PORT`（Render 会注入默认端口，无需覆盖）
3. 保存并重启服务（Render 会自动部署最新代码）。

行为与限制
- 应用启动时会跳过对 Postgres 的主动连接，避免 `ECONNREFUSED` 导致进程崩溃。
- 实时游戏逻辑（内存中的 players/bots/orbs）仍然可用，游客可以连接并游玩。
- 但所有需要数据库的接口将返回 HTTP 503（不可用）。常见受影响接口：
  - `/register`（用户注册）
  - `/auth/login`（登录）
  - `/leaderboard`（排行榜持久化查询）
  - `/stats`（用户统计）

测试服务
- 在 Render Shell 或本地终端运行：
```sh
curl -i https://your-service.onrender.com/    # 静态页面
curl -f https://your-service.onrender.com/leaderboard || echo "leaderboard unavailable (expected in NO_DB mode)"
```

何时恢复为有数据库模式
- 在 Render Environment 中删除 `NO_DB`，并设置 `DATABASE_URL` 为有效的 Postgres 连接字符串（Render 可通过 Attach Database 提供），然后重启服务。
- 如首次使用数据库，请运行一次：
```sh
npm run db:setup
```

注意
- 无持久化数据：服务重启或实例缩放会丢失内存中的玩家与排行榜数据。
- 不建议用于生产；生产环境应连接真实数据库并使用强 `JWT_SECRET` 等安全设置。

```
