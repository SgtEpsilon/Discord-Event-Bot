# Remote Access Guide: Discord-Event-Bot Web UI

⚠️ **CRITICAL SECURITY WARNING**  
The Discord-Event-Bot web interface (`http://localhost:3000`) has **NO authentication by default**. Exposing it directly to the internet without protection will allow anyone to create/delete events and access your data. Always add authentication before public exposure.

---

## Option 1: Cloudflare Tunnel (Recommended)

Cloudflare Tunnel creates an encrypted connection from your machine to Cloudflare's network—**no open firewall ports required**.

### Prerequisites
- Cloudflare account (free tier works)
- Discord-Event-Bot running locally on port `3000` (or your custom `WEB_PORT`)

### Step-by-Step Setup

#### 1. Install `cloudflared`
```bash
# Linux (Debian/Ubuntu)
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared

# macOS (Homebrew)
brew install cloudflared

# Windows (PowerShell)
winget install Cloudflare.cloudflared
```

#### 2. Authenticate with Cloudflare
```bash
cloudflared tunnel login
```
→ Opens browser to authenticate your Cloudflare account

#### 3. Create a Tunnel
```bash
cloudflared tunnel create discord-event-bot
```
→ Note the generated tunnel ID (e.g., `abc123-def456`)

#### 4. Configure Routing
Create `~/.cloudflared/config.yml`:
```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /root/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: events.yourdomain.com    # ← Replace with your domain
    service: http://localhost:3000
  - service: http_status:404
```

#### 5. Route DNS to Tunnel
```bash
cloudflared tunnel route dns YOUR_TUNNEL_ID events.yourdomain.com
```

#### 6. Start Tunnel (Persistent)
```bash
# Run once manually
cloudflared tunnel run discord-event-bot

# OR set up as systemd service (Linux)
cloudflared service install
systemctl enable cloudflared
systemctl start cloudflared
```

✅ **Access your web UI at**: `https://events.yourdomain.com` (HTTPS enforced by Cloudflare)

---

## Option 2: Cloudflare Tunnel + Authentication Layer (Secure)

Since the bot lacks built-in auth, add a reverse proxy with basic auth:

### Using Caddy (simplest)
1. Install [Caddy](https://caddyserver.com/)
2. Create `Caddyfile`:
```text
events.yourdomain.com {
    basicauth /* {
        yourusername JDJhJDEwJEU4b3VkLmZvby5iYXIuYmF6 # ← generate with `caddy hash-password`
    }
    reverse_proxy localhost:3000
}
```
3. Point Cloudflare Tunnel to `http://localhost:2015` (Caddy's default port) instead of `3000`

---

## Option 3: Cloudflare Tunnel Manager (Zero-Config)

For quick temporary access without DNS setup:

```bash
cloudflared tunnel --url http://localhost:3000
```
→ Generates a `*.trycloudflare.com` URL valid for 1 hour  
→ **Only use for testing**—still requires authentication layer for production

---

## Security Checklist Before Going Public

- [ ] ✅ Add authentication (Caddy/nginx basic auth or OAuth proxy)
- [ ] ✅ Enable Cloudflare WAF rules to block scanners
- [ ] ✅ Restrict tunnel to your domain only (no wildcard routes)
- [ ] ✅ Set up Cloudflare Access policies (Zero Trust) for team-only access:
  - Cloudflare Dashboard → Zero Trust → Access → Applications
  - Create application with your tunnel URL + identity providers

---

## Quick Reference Table

| Method                          | Setup Time | Security | Best For                     |
|--------------------------------|------------|----------|------------------------------|
| Cloudflare Tunnel + Auth       | 15 min     | ★★★★★    | Production deployments       |
| Cloudflare Tunnel (no auth)    | 5 min      | ★☆☆☆☆    | **NOT RECOMMENDED**          |
| Tunnel Manager (trycloudflare) | 1 min      | ★★☆☆☆    | Temporary testing only       |
| Direct port forwarding         | 2 min      | ☆☆☆☆☆    | **Never expose unauthenticated UI** |

---

## Troubleshooting

- **Tunnel disconnects**: Run as systemd service (`cloudflared service install`)
- **404 errors**: Verify `ingress` rules in `config.yml` match your hostname
- **Connection refused**: Ensure bot is running (`npm run start:all`) before starting tunnel
- **Cloudflare SSL errors**: Wait 1-2 minutes after DNS propagation

> 💡 **Pro Tip**: For production use, combine Cloudflare Tunnel with [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/) to require Google/GitHub login before accessing your web UI—zero code changes needed.