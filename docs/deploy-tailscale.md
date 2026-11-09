# Self-hosting on a tailnet (web-pwa fork)

LearnHarness runs as a web app on one Linux server and is reached from every device on your
[Tailscale](https://tailscale.com) network over HTTPS — as a normal page, or installed as an app
(PWA) on phones, tablets and laptops. Nothing is exposed to the public internet.

```
 phone / tablet / laptop ──tailnet HTTPS──▶ ┌ tailscale (sidecar) ─────────────┐
                                            │ https://learnharness.<tailnet>   │
                                            │   └─ proxy ▶ 127.0.0.1:3000 ─┐   │
                                            └──────────── shared network ns ─┼───┘
                                            ┌ learnharness ──────────────────▼───┐
                                            │ Next standalone server · Chromium  │
                                            │ Claude Code CLI · /data · /secrets │
                                            └────────────────────────────────────┘
```

- `Dockerfile` builds the same standalone server the desktop app ships, plus Chromium (demo
  verification) and the Claude Code CLI (the Claude subscription provider).
- `deploy/compose.yaml` runs it beside a Tailscale container that serves it as its own tailnet
  machine, `learnharness`. The app listens on loopback only; Funnel is explicitly off.
- Your data lives in `deploy/state/data` (sessions, graph, settings, uploads) and keys in
  `deploy/state/secrets`. Claude Code's install and sign-in live in the `claude-home` volume.

**Trust model.** The web server has no logins of its own: anyone who can reach it can use it and
spend your API keys. The tailnet is the access boundary — keep it to your own devices (or use
Tailscale ACLs), and never enable Funnel for it.

## First deploy

On the server (Docker with the Compose plugin):

```bash
git clone -b web-pwa https://github.com/Zenith-8/learnharness.git
cd learnharness/deploy
cp .env.example .env
```

1. **Auth key.** In the Tailscale admin console → Settings → Keys, generate an auth key
   (not reusable, not ephemeral) and put it in `deploy/.env` as `TS_AUTHKEY=`. It is only used on
   the first start; afterwards you can delete it from the file.
2. **Bring your existing data (optional).** Close the desktop app on Windows, then zip the data
   folder:

   ```powershell
   Compress-Archive -Path "$env:APPDATA\LearnHarness\data\*" -DestinationPath "$env:USERPROFILE\Desktop\lh-data.zip"
   ```

   Copy `lh-data.zip` to the server (e.g. Termius SFTP into `~/`), then:

   ```bash
   mkdir -p state/data && unzip ~/lh-data.zip -d state/data
   ```

   (`sudo apt install unzip` if it is missing.) The folder should now contain `chats/`, `graph/`,
   `jobs/` and `settings.json`. API keys are **not** in it
   (the desktop app keeps them in a separate `auth.json`); you re-enter them in Settings.
   From now on use the server, not the desktop app — two copies of the data would drift apart.
3. **Start it.** The first build takes several minutes.

   ```bash
   docker compose up -d --build
   docker compose logs -f learnharness   # Ctrl+C once it is serving
   ```

4. **Sign in to Claude Code** (for the Claude subscription provider). Run as the `node` user so
   the sign-in lands in the persisted home:

   ```bash
   docker compose exec -u node learnharness claude
   ```

   Type `/login`, open the URL it prints on any device, paste the code back, then `/exit`.
5. **Open** `https://learnharness.<your-tailnet>.ts.net` (the machine shows up as `learnharness` in
   the admin console). In Settings → Providers enable Claude Code and pick models under Agent.

## Install as an app

- **iPhone / iPad:** open the URL in Safari → Share → *Add to Home Screen*.
- **Android:** Chrome → ⋮ → *Install app*.
- **Laptop:** Chrome or Edge → the install icon at the right of the address bar.

The installed app needs Tailscale connected on that device; without it you get a "Can't reach
LearnHarness" page with a retry button.

## Using it from a phone

Below 640px wide the layout switches to a phone layout: a bottom tab bar (Learn, Graph, Practice,
Settings), the session list as a full-screen panel, a question dock that always leaves part of the
lesson visible, and a full-width Dictate button.
On a touch phone Return inserts a newline; use the Submit/Send buttons to send. Tablets and laptops
get the regular layout.

Attachments upload from any browser (the paperclip, or drag and drop on a laptop) into
`state/data/uploads`. Folder attachments remain desktop-app only. If you turn on file-access
restrictions in Settings → Agent, add `/data/uploads` to the allowed folders.

## Updating

Upstream releases often. On a development machine:

```bash
git fetch upstream
git rebase upstream/main      # resolve conflicts; mobile overrides live in app/mobile.css
git push --force-with-lease origin web-pwa
```

Then on the server:

```bash
cd learnharness && git pull --rebase && cd deploy
docker compose up -d --build
```

When LearnHarness asks for a newer Claude Code:

```bash
docker compose exec -u node learnharness claude update
```

## Backups

Everything worth keeping is in `deploy/state`:

```bash
tar czf ~/lh-backup-$(date +%F).tgz -C ~/learnharness/deploy state/data
```

Restore by stopping the stack (`docker compose down`), unpacking into `deploy/`, and starting it
again. `state/secrets` holds your API keys in plain text — back it up only somewhere private.

## Troubleshooting

- `docker compose logs tailscale` — sign-in problems (expired/used auth key: put a fresh one in
  `.env`, then `docker compose up -d`).
- `docker compose logs learnharness` — server errors.
- `docker compose ps` — the app has a health check; `unhealthy` means the server is not answering
  on 127.0.0.1:3000.
- A "same-origin" 403 in Settings means a request reached the server under a different host than
  the page was loaded from; always use the `https://…ts.net` URL.
