# syntax=docker/dockerfile:1
#
# LearnHarness as a self-hosted web app (web-pwa fork). The server is the
# same standalone Next build the desktop app spawns; this image adds what the
# Electron shell otherwise supplies: a Chromium for demo verification
# (CHROME_PATH, the documented fallback) and the Claude Code CLI for the
# Claude subscription provider. Deployment: deploy/compose.yaml.

FROM node:26-trixie AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# build-server.mjs copies public/ + .next/static into the standalone tree and
# refuses a payload that swept in data/ or keys.
RUN npx next build && node scripts/build-server.mjs

FROM node:26-trixie-slim AS runtime
RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
		ca-certificates curl tini chromium fonts-noto-core fonts-noto-cjk fonts-noto-color-emoji \
	&& rm -rf /var/lib/apt/lists/*

# Claude Code installs into the node user's home, which compose mounts as a
# named volume: the first mount copies this install in, then sign-in state and
# `claude update` persist across image rebuilds.
ARG CLAUDE_CODE_VERSION=latest
USER node
ENV HOME=/home/node PATH=/home/node/.local/bin:$PATH
RUN curl -fsSL https://claude.ai/install.sh | bash -s "$CLAUDE_CODE_VERSION" && claude --version

USER root
WORKDIR /app
COPY --from=build --chown=node:node /src/.next/standalone ./
COPY deploy/entrypoint.sh /usr/local/bin/lh-entrypoint
RUN chmod 755 /usr/local/bin/lh-entrypoint && mkdir -p /data /secrets && chown node:node /data /secrets

# Loopback only: the Tailscale sidecar shares this network namespace and is
# the sole way in (deploy/tailscale/serve.json). No port is published.
ENV NODE_ENV=production \
	HOSTNAME=127.0.0.1 \
	PORT=3000 \
	LH_DATA_DIR=/data \
	LH_AUTH_FILE=/secrets/auth.json \
	CHROME_PATH=/usr/bin/chromium

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
	CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"

ENTRYPOINT ["tini", "--", "lh-entrypoint"]
CMD ["node", "server.js"]
