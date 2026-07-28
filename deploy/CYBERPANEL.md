# CyberPanel deploy setup

Target: `/home/pharmeasy.in/public_html/medicines-by-class`
Served at: `https://pharmeasy.in/medicines-by-class/`

GitHub Actions pushes the built site over SSH with rsync. The deploy key is
locked to that one directory with `rrsync`, so even if the key leaked it
cannot read or write anything else on the box, and cannot open a shell.

---

## Before you start — two warnings

**1. `--delete` is on.** Anything in `medicines-by-class/` that isn't in the
build gets removed on every deploy. That folder must hold *only* the generated
site. Don't park anything else there.

**2. You do not need `price-proxy.php`.** It exists for the case where the
pages are served from a non-pharmeasy.in domain, because `api.pharmeasy.in`
only returns CORS headers to pharmeasy.in origins. Serving from
`pharmeasy.in/medicines-by-class/` means the browser origin is already
pharmeasy.in, so the API is called directly. Ignore that file.

---

## Step 1 — find the site user (on the server, as root)

```bash
stat -c 'owner=%U group=%G' /home/pharmeasy.in/public_html
```

Use that owner as `DEPLOY_USER` below. Deploying as the site user means the
files land with the ownership OpenLiteSpeed already expects — no chown pass
afterwards.

Check it has a real shell (a forced command still needs one to exec):

```bash
getent passwd <owner>
```

If it ends in `/sbin/nologin` or `/bin/false`:

```bash
usermod -s /bin/bash <owner>
```

That is safe here: the deploy key is pinned to a forced command, so it can
still only ever run rrsync.

## Step 2 — locate rrsync

```bash
ls -1 /usr/bin/rrsync /usr/share/rsync/rrsync /usr/share/doc/rsync*/support/rrsync 2>/dev/null
```

If nothing prints, install it:

```bash
dnf install -y rsync && ls -1 /usr/bin/rrsync /usr/share/rsync/rrsync 2>/dev/null
```

Note the path that exists — call it `RRSYNC` in the next step.

## Step 3 — create the directory and authorise the key

```bash
U=<owner from step 1>
RRSYNC=<path from step 2>
DIR=/home/pharmeasy.in/public_html/medicines-by-class
HOME_DIR=$(getent passwd "$U" | cut -d: -f6)

mkdir -p "$DIR"
chown "$U": "$DIR"

mkdir -p "$HOME_DIR/.ssh"
chmod 700 "$HOME_DIR/.ssh"

cat >> "$HOME_DIR/.ssh/authorized_keys" <<EOF
command="$RRSYNC -wo $DIR",restrict ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIB50zivk3PJuVt7DvqxxESWME1H/AVoKc4KE6r8/Y1yR github-actions@medicines-by-class
EOF

chmod 600 "$HOME_DIR/.ssh/authorized_keys"
chown -R "$U": "$HOME_DIR/.ssh"
```

What the options do:

| Option | Effect |
|---|---|
| `command="rrsync ... $DIR"` | the key can only ever run rrsync, rooted at that directory |
| `-wo` | write-only — the key can upload but cannot read files back off the server |
| `restrict` | no shell, no port forwarding, no agent forwarding, no PTY, no X11 |

Delete is deliberately left enabled so removed class pages disappear from the
site. If you'd rather they linger, add `-no-del` after `-wo`.

## Step 4 — collect the host key

Run locally (not on the server), so GitHub can verify it's really your box:

```bash
ssh-keyscan -t ed25519 <server-ip-or-hostname>
```

Copy the whole output line.

## Step 5 — set the GitHub secrets

Repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Value |
|---|---|
| `DEPLOY_HOST` | server IP or hostname |
| `DEPLOY_USER` | the owner from step 1 |
| `DEPLOY_PATH` | `.` — **exactly a single dot** |
| `DEPLOY_SSH_KEY` | contents of `deploy/keys/mbc_deploy` (the private one, including the BEGIN/END lines) |
| `DEPLOY_KNOWN_HOSTS` | the `ssh-keyscan` line from step 4 |

`DEPLOY_PATH` is `.` because rrsync already roots the session at
`medicines-by-class/`. Putting the absolute path there would resolve to
`medicines-by-class/home/pharmeasy.in/...` and the deploy would fail.

## Step 6 — deploy

Actions → **Build and deploy Medicines by Class** → Run workflow.

Until the secrets are set the rsync step logs `DEPLOY_* secrets not set` and
exits 0, so the rest of the pipeline keeps working.

## Step 7 — verify

```bash
curl -sI https://pharmeasy.in/medicines-by-class/ | head -1
curl -s https://pharmeasy.in/medicines-by-class/antibiotics/ | grep -o '<title>[^<]*'
```

Both should be `200` and a real title. If the directory URL 404s but
`.../antibiotics/index.html` works, OpenLiteSpeed isn't serving the index file
for that vhost — add `index.html` to the vhost's index files in CyberPanel
(Websites → pharmeasy.in → vHost Conf → `indexFiles index.html`).

---

## Confirming the lockdown works

From your laptop, with the private key:

```bash
ssh -i deploy/keys/mbc_deploy <user>@<host>
```

Expected: it refuses to give you a shell. If you land at a prompt, the
`command=` line didn't take — check you appended it to the right user's
`authorized_keys` and that the file is `chmod 600`.

---

## If the deploy step fails

**`rrsync error: option "--xxx" has been disallowed`** — an older rrsync with a
narrower whitelist. The workflow sends `-az --delete`; drop `-z` first
(line 105 of the workflow), then `-a` → `-rltD` if it still complains.

**`Permission denied (publickey)`** — the key isn't authorised for the user in
`DEPLOY_USER`, or `.ssh`/`authorized_keys` permissions are wrong (`700`/`600`,
owned by that user).

**`Host key verification failed`** — `DEPLOY_KNOWN_HOSTS` is missing, stale, or
was captured for a different hostname than `DEPLOY_HOST`. Re-run
`ssh-keyscan` against the exact value in `DEPLOY_HOST`.

**Deploy reports success but the site is unchanged** — `DEPLOY_PATH` isn't `.`,
so the files landed in a nested path under `medicines-by-class/`. Check with:

```bash
find /home/pharmeasy.in/public_html/medicines-by-class -maxdepth 2 -name index.html | head
```

**`rsync: failed to set permissions`** — the directory isn't owned by
`DEPLOY_USER`. Re-run the `chown` from step 3.
