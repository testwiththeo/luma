# Luma

[GitHub repository](https://github.com/testwiththeo/luma) · [Live application](https://luma.theodores.dev/) · [CI workflow](https://github.com/testwiththeo/luma/actions/workflows/ci.yml) · [Deployment workflow](https://github.com/testwiththeo/luma/actions/workflows/deploy.yml)

[![CI](https://github.com/testwiththeo/luma/actions/workflows/ci.yml/badge.svg)](https://github.com/testwiththeo/luma/actions/workflows/ci.yml)

Luma is a local-first Kanban workspace for QA and software engineering work. It runs as a single Node.js service with a React frontend and SQLite persistence.

## Local development

Requirements: Node.js 22+ and pnpm 12+.

```bash
pnpm install
pnpm db:migrate
pnpm dev
```

The development UI runs at `http://localhost:5173` and proxies `/api` to the API at `http://localhost:3000`.

Run the complete local quality gate:

```bash
pnpm check
```

## Production Docker deployment

Build and start Luma with persistent SQLite storage:

```bash
docker compose up -d --build
curl http://localhost:3000/health
```

Open `http://localhost:3000`. The SQLite database is stored in the named `luma-data` volume mounted at `/app/data`. Migrations run before the HTTP server accepts traffic, and the container healthcheck reports readiness.

To use a different host port:

```bash
LUMA_PORT=8080 docker compose up -d --build
```

The runtime listens on `0.0.0.0` inside the container. Put a TLS-terminating reverse proxy such as Caddy or Nginx in front of it for a public domain.

## Upgrade

```bash
docker compose pull
# or, for a local build:
docker compose build --pull
docker compose up -d
```

The application applies pending database migrations during startup. Keep the data volume when recreating the container.

## Backup and restore

Create a consistent SQLite backup from the running container:

```bash
mkdir -p backups
docker compose exec -T luma node -e "const Database=require('/app/api/node_modules/better-sqlite3'); const db=new Database('/app/data/luma.db'); db.backup('/app/data/luma-backup.db').then(() => db.close())"
docker cp "$(docker compose ps -q luma)":/app/data/luma-backup.db ./backups/luma-$(date +%Y%m%d-%H%M%S).db
```

To restore, stop Luma, replace the database in the volume, and start it again. Do not overwrite a live SQLite database:

```bash
docker compose stop luma
# Copy the selected backup to the data volume's luma.db location.
docker compose up -d luma
```

The exact volume path can be found with `docker volume inspect luma_luma-data`.

## Continuous deployment

The `Deploy Luma` GitHub Actions workflow deploys every successful push to `main` through SSH. Prepare the server once:

```bash
git clone https://github.com/testwiththeo/luma.git /opt/luma
cd /opt/luma
docker compose up -d --build
```

Create a GitHub Actions `production` environment and add these secrets:

| Secret           | Value                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------ |
| `DEPLOY_HOST`    | Server hostname or IP; do not use the Cloudflare domain unless it resolves directly to SSH |
| `DEPLOY_USER`    | Linux user allowed to run Docker Compose                                                   |
| `DEPLOY_SSH_KEY` | Private deploy key whose public key is in the server user's `~/.ssh/authorized_keys`       |
| `DEPLOY_PATH`    | Absolute checkout path, for example `/opt/luma`                                            |
| `DEPLOY_PORT`    | Optional SSH port; defaults to `22`                                                        |

The workflow never stores these values in the repository. It fetches `origin/main`, resets the server checkout to that commit, rebuilds the image, starts Compose, and checks the local health endpoint.

## Environment variables

| Variable         | Default                                   | Purpose                             |
| ---------------- | ----------------------------------------- | ----------------------------------- |
| `PORT`           | `3000`                                    | HTTP port inside the container      |
| `HOST`           | `127.0.0.1` locally, `0.0.0.0` in Compose | Bind address                        |
| `DATABASE_URL`   | `file:./data/luma.db`                     | SQLite database URL                 |
| `DATA_DIR`       | `./data`                                  | Writable application data directory |
| `WEB_DIST_DIR`   | `./web`                                   | Built frontend directory            |
| `MAX_JSON_BYTES` | `1000000`                                 | JSON request size policy            |

## Public deployment checklist

1. Provision a host with Docker and Compose.
2. Copy the repository or pull a versioned image.
3. Configure DNS for the public domain.
4. Put Caddy/Nginx/Traefik in front of port `3000` for HTTPS.
5. Run `docker compose up -d --build`.
6. Verify `/health`, board creation, and persistence after container recreation.
7. Schedule backups of the `luma-data` volume.

Luma does not require an account, external database, analytics service, or third-party integration for the MVP.
