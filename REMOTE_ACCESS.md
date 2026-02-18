# Remote WebUI Access

This guide covers how to expose the Discord Event Bot's web dashboard to the internet so it can be accessed from anywhere — not just on your local network.

The **primary and recommended method** is Cloudflare Tunnel. It requires no port forwarding, no static IP, and handles HTTPS automatically for free. Alternative methods are listed at the end for completeness.

---

## Prerequisites (all methods)

- The bot and web server are running (see [QUICKSTART.md](QUICKSTART.md))
- You know the local address of the dashboard, e.g. `http://localhost:3000`
- A machine that stays on (server, VPS, always-on PC, Raspberry Pi, etc.)

---

## Option 1 — Cloudflare Tunnel (Recommended)

Cloudflare Tunnel runs a lightweight daemon called `cloudflared` on your server. It opens an outbound-only connection to Cloudflare's network — no firewall rules, no open ports, no public IP required. Cloudflare then routes traffic from your chosen domain to your local web server.

**Free tier is sufficient.** You only need a Cloudflare account and a domain managed by Cloudflare.

### Step 1 — Add your domain to Cloudflare

If you haven't already:
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) and add your domain.
2. Update your domain's nameservers to Cloudflare's (your registrar's DNS settings).
3. Wait for the nameserver change to propagate (usually a few minutes to a few hours).

### Step 2 — Create a tunnel

1. In the Cloudflare dashboard, go to **Zero Trust** (also accessible via the sidebar → "Access" → "Launch Zero Trust").
2. Navigate to **Networks → Tunnels**.
3. Click **Add a tunnel** → select **Cloudflared**.
4. Give the tunnel a name (e.g. `discord-event-bot`) and click **Save tunnel**.
5. Cloudflare will display an install command with your tunnel token embedded. **Copy the token** — you'll need it in the next step.

### Step 3 — Install and run cloudflared

**Linux (recommended for servers):**

```bash
# Download and install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb

# Run the tunnel (replace <YOUR_TOKEN> with the token from the dashboard)
cloudflared tunnel run --token <YOUR_TOKEN>
```

To run cloudflared as a persistent background service so it survives reboots:

```bash
sudo cloudflared service install <YOUR_TOKEN>
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

**Windows:**

Download the `.exe` from the [Cloudflare releases page](https://github.com/cloudflare/cloudflared/releases/latest) and run:

```powershell
.\cloudflared.exe tunnel run --token <YOUR_TOKEN>
```

**macOS:**

```bash
brew install cloudflare/cloudflare/cloudflared
cloudflared tunnel run --token <YOUR_TOKEN>
```

### Step 4 — Configure the public hostname

Back in the Cloudflare Zero Trust dashboard, after saving the tunnel:

1. Click **Next** (or go to the tunnel's **Public Hostnames** tab).
2. Click **Add a public hostname**.
3. Fill in:
   - **Subdomain:** e.g. `events`
   - **Domain:** your Cloudflare-managed domain, e.g. `yourdomain.com`
   - **Service → Type:** `HTTP`
   - **Service → URL:** `localhost:3000` (or whatever port your web server uses)
4. Click **Save hostname**.

Your dashboard will now be accessible at `https://events.yourdomain.com` with automatic HTTPS.

### Step 5 — (Strongly Recommended) Lock it down with Cloudflare Access

Without an access policy, your dashboard is public to the entire internet. To restrict it to only yourself (or your team):

1. In Zero Trust, go to **Access → Applications → Add an application**.
2. Select **Self-hosted**.
3. Set the **Application domain** to match the hostname you just created (`events.yourdomain.com`).
4. Under **Policies**, add an **Allow** rule — the simplest option is **Emails** and enter your email address.
5. Under **Authentication**, enable **One-time PIN** (no external identity provider needed — Cloudflare will email you a code to log in).
6. Save the application.

Now anyone hitting your URL will be prompted to authenticate via Cloudflare Access before seeing the dashboard.

---

## Option 2 — Port Forwarding (No Cloudflare domain required)

If you have a static public IP or a dynamic DNS service (e.g. DuckDNS, No-IP), you can expose the web server directly through your router.

> ⚠️ This opens a port on your network to the public internet. Make sure the dashboard itself has authentication, or restrict access by IP in `config.json` or your web server settings.

1. Log into your router's admin panel (usually `192.168.1.1` or `192.168.0.1`).
2. Find **Port Forwarding** settings.
3. Forward an external port (e.g. `3000`) to your server's local IP and port (e.g. `192.168.1.100:3000`).
4. Access the dashboard at `http://<your-public-ip>:3000`.

**To get HTTPS with port forwarding:** Set up a reverse proxy (e.g. Nginx or Caddy) in front of the web server and use Let's Encrypt for a free SSL certificate. Caddy does this automatically:

```bash
# Example Caddyfile for automatic HTTPS
events.yourdomain.com {
    reverse_proxy localhost:3000
}
```

---

## Option 3 — VPS Reverse Proxy (Cloud-hosted)

If you're running the bot on a VPS (DigitalOcean, Hetzner, Oracle Cloud, etc.) that already has a public IP, you can skip Cloudflare Tunnel and just set up a reverse proxy directly.

1. Install Nginx:
   ```bash
   sudo apt install nginx
   ```

2. Create a site config at `/etc/nginx/sites-available/eventbot`:
   ```nginx
   server {
       listen 80;
       server_name events.yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. Enable the site and get a free SSL certificate:
   ```bash
   sudo ln -s /etc/nginx/sites-available/eventbot /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d events.yourdomain.com
   ```

---

## Comparison

| Method | Cost | Open ports | Static IP needed | HTTPS | Difficulty |
|---|---|---|---|---|---|
| **Cloudflare Tunnel** | Free | None | No | Automatic | Easy |
| Port Forwarding | Free | Yes | Recommended | Manual | Medium |
| VPS Reverse Proxy | VPS cost | Yes (on VPS) | Yes (VPS has one) | Via Certbot | Medium |

---

## Troubleshooting Remote Access

**Tunnel shows "Unhealthy" or "Disconnected" in the Cloudflare dashboard**
- Check that `cloudflared` is running: `sudo systemctl status cloudflared`
- View logs: `sudo journalctl -u cloudflared -f`
- Restart: `sudo systemctl restart cloudflared`

**Dashboard loads but shows errors or blank content**
- Confirm the bot's web server is actually running locally first: `curl http://localhost:3000`
- Check the port number in your tunnel configuration matches the one in `config.json` or `.env`

**Cloudflare Access login loop / can't receive PIN**
- Check your spam folder for the Cloudflare Access email
- Verify the email you entered in the Access policy exactly matches the one you're logging in with
- Ensure your Access application domain matches the public hostname exactly

**Port forwarding not reachable from outside**
- Confirm your ISP isn't blocking the port (some ISPs block common ports like 80/443 on residential lines)
- Double-check your server's local IP hasn't changed — set a static local IP or DHCP reservation on your router
- Try a different external port if the chosen one is blocked
