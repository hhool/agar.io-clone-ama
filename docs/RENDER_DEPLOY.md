Render deployment — NO_DB demo and production checklist

1) For quick demo without database (NO_DB mode)

- Open your Render service dashboard -> Environment
- Add a new Environment Variable:
  - Name: `NO_DB`
  - Value: `1`
  - Leave "Secret" unset (not required for NO_DB)
- Ensure Automatic Deploys from the `dev_deploy` branch are enabled (or push to the branch manually)
- Trigger a redeploy by pushing to `dev_deploy` or clicking "Manual Deploy" in Render

2) Verify the service is up

- Use the HTTP smoke-test script (from repo root):

```bash
chmod +x scripts/smoke_test_render.sh
./scripts/smoke_test_render.sh https://your-service.onrender.com
```

- Or call health endpoint directly:

```bash
curl -sS https://your-service.onrender.com/health | jq .
```

Expected health output when NO_DB=1:

```json
{ "status": "ok", "db": "disabled" }
```

3) Run socket smoke-test

```bash
npm install --no-save socket.io-client
node scripts/smoke_test_socket.js https://your-service.onrender.com
```

Expected: script logs `connected, socket id = ...` and exits 0.

4) If you want a production deployment with Postgres

- Create or attach a Postgres instance on Render and copy the `DATABASE_URL` value
- In Render dashboard -> Environment, add `DATABASE_URL` (as a Secret)
- Remove `NO_DB` or set it to `0`/unset
- Open the service shell (Render web shell) and run:

```bash
npm run db:setup
```

- Confirm `/health` returns `{ "status": "ok", "db": "ok" }`

5) Troubleshooting

- If `/health` returns `unavailable`, check Render logs for `ECONNREFUSED` or connection errors.
- Confirm `DATABASE_URL` is correctly set and reachable from the Render region.
- For quick recovery/demos, re-enable `NO_DB=1` and redeploy.

6) Notes

- `NO_DB` disables DB access and database setup; persistent features (leaderboard, login) will be unavailable.
- For CI: set `RENDER_SERVICE_URL` as a repository secret so the smoke-test workflow can poll the deployed service.
