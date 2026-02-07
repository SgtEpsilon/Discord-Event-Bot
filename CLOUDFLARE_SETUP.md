# Cloudflare Tunnel Setup Guide for Discord Event Bot

This guide will help you set up Cloudflare Tunnel to access your Discord Event Bot from anywhere in the world, completely free!

## Table of Contents

- [What is Cloudflare Tunnel?](#what-is-cloudflare-tunnel)
- [Quick Start (Temporary URL)](#quick-start-temporary-url)
- [Permanent Setup](#permanent-setup)
- [Running on Startup](#running-on-startup)
- [Troubleshooting](#troubleshooting)
- [Alternative Options](#alternative-options)

---

## What is Cloudflare Tunnel?

Cloudflare Tunnel creates a secure connection from your computer to Cloudflare's network, making your bot accessible from anywhere without:
- Port forwarding
- Exposing your home IP address
- Configuring your router
- Paying for hosting

**Benefits:**
- ✅ Free forever
- ✅ HTTPS included automatically
- ✅ No router configuration needed
- ✅ Access from anywhere (phone, work, friend's house)
- ✅ More secure than port forwarding

---

## Quick Start (Temporary URL)

Perfect for testing or one-time use. Takes 2 minutes!

### Step 1: Download Cloudflare Tunnel

**Windows:**

1. Go to: https://github.com/cloudflare/cloudflared/releases
2. Scroll down to "Assets"
3. Download: `cloudflared-windows-amd64.exe`
4. Move the file to your Discord bot folder (same folder as `bot.js`)
5. Rename it to: `cloudflared.exe`

**Mac:**

Open Terminal and run:
```bash
brew install cloudflared
```

If you don't have Homebrew, install it first:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**Linux:**

Choose the method that works best for your distribution:

**Option 1: Ubuntu/Debian (via .deb package - Recommended):**
```bash
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
```

**Option 2: Ubuntu/Debian/Fedora/RHEL (manual install):**
```bash
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
```

**Option 3: Arch Linux (via AUR):**
```bash
yay -S cloudflared
# or
paru -S cloudflared
```

**Option 4: Using snap (works on most distros):**
```bash
sudo snap install cloudflared
```

**Verify installation:**
```bash
cloudflared --version
```

You should see something like: `cloudflared version 2024.x.x`

### Step 2: Start Your Web Server

Open a terminal in your bot folder and run:

```bash
node web-server.js
```

You should see:
```
🌐 Web interface running on http://localhost:3000
```

**Keep this terminal open!**

### Step 3: Start the Tunnel

Open a **NEW** terminal in the same folder and run:

**Windows:**
```bash
cloudflared.exe tunnel --url http://localhost:3000
```

**Mac/Linux:**
```bash
cloudflared tunnel --url http://localhost:3000
```

### Step 4: Get Your URL

Look for output like this:

```
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable): |
|  https://abc-def-ghi.trycloudflare.com                                                     |
+--------------------------------------------------------------------------------------------+
```

**Copy that URL!** For example: `https://abc-def-ghi.trycloudflare.com`

### Step 5: Test It

1. Open the URL in your browser
2. You should see your Discord Event Bot Manager! 🎉
3. Share this URL with anyone who needs access

**Note:** This URL is temporary and changes every time you restart the tunnel. For a permanent URL, continue to the next section.

---

## Permanent Setup

Get a permanent URL that doesn't change. Takes 10-15 minutes.

### Step 1: Create Cloudflare Account

1. Go to: https://dash.cloudflare.com/sign-up
2. Sign up with your email (free account)
3. Verify your email address
4. Log in to the Cloudflare dashboard

### Step 2: Authenticate Cloudflared

Open a terminal in your bot folder and run:

**Windows:**
```bash
cloudflared.exe tunnel login
```

**Mac/Linux:**
```bash
cloudflared tunnel login
```

**What happens:**
1. Your browser will open automatically
2. You'll see the Cloudflare authorization page
3. Click "Authorize" to allow cloudflared to access your account
4. You'll see: "You have successfully logged in"
5. Close the browser tab and return to terminal

You should see:
```
A tunnel has been successfully installed.
```

### Step 3: Create Your Tunnel

Choose a name for your tunnel (lowercase, no spaces). For example: `discord-bot`

**Windows:**
```bash
cloudflared.exe tunnel create discord-bot
```

**Mac/Linux:**
```bash
cloudflared tunnel create discord-bot
```

**Output:**
```
Tunnel credentials written to: C:\Users\YourName\.cloudflared\<TUNNEL-ID>.json
Created tunnel discord-bot with id <TUNNEL-ID>
```

**Important:** Save that Tunnel ID! You'll need it later.

Example Tunnel ID: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

### Step 4: Configure Your Tunnel

Create a configuration file for your tunnel.

**Option A: Simple Method (Recommended)**

Just run the tunnel with the route command:

**Windows:**
```bash
cloudflared.exe tunnel route dns discord-bot discord-bot
```

**Mac/Linux:**
```bash
cloudflared tunnel route dns discord-bot discord-bot
```

This creates a subdomain like: `discord-bot.cfargotunnel.com`

**Option B: Advanced Method (Custom Configuration)**

Create a file named `cloudflared-config.yml` in your bot folder:

**Windows users:** The default location is `C:\Users\YourName\.cloudflared\config.yml`
**Mac/Linux users:** The default location is `~/.cloudflared/config.yml`

**Content of config.yml:**
```yaml
tunnel: <YOUR-TUNNEL-ID>
credentials-file: C:\Users\YourName\.cloudflared\<TUNNEL-ID>.json

ingress:
  - service: http://localhost:3000
```

**Replace:**
- `<YOUR-TUNNEL-ID>` with your actual tunnel ID from Step 3
- `C:\Users\YourName\.cloudflared\<TUNNEL-ID>.json` with your actual path

**Mac/Linux example:**
```yaml
tunnel: a1b2c3d4-e5f6-7890-abcd-ef1234567890
credentials-file: /home/yourname/.cloudflared/a1b2c3d4-e5f6-7890-abcd-ef1234567890.json

ingress:
  - service: http://localhost:3000
```

### Step 5: Get Your Permanent URL

**If you used Option A (Simple Method):**

Your URL will be in the format:
```
https://<TUNNEL-ID>.cfargotunnel.com
```

Example: `https://a1b2c3d4-e5f6-7890-abcd-ef1234567890.cfargotunnel.com`

**To use a nicer subdomain (optional):**

If you own a domain added to Cloudflare:
```bash
cloudflared tunnel route dns discord-bot mybot.yourdomain.com
```

Then your URL will be: `https://mybot.yourdomain.com`

### Step 6: Run Your Tunnel

**Simple command (if you used Option A):**

**Windows:**
```bash
cloudflared.exe tunnel run discord-bot
```

**Mac/Linux:**
```bash
cloudflared tunnel run discord-bot
```

**With config file (if you used Option B):**

**Windows:**
```bash
cloudflared.exe tunnel --config cloudflared-config.yml run discord-bot
```

**Mac/Linux:**
```bash
cloudflared tunnel --config ~/.cloudflared/config.yml run discord-bot
```

### Step 7: Test Your Setup

1. Make sure `node web-server.js` is running in one terminal
2. Make sure `cloudflared tunnel run discord-bot` is running in another terminal
3. Open your permanent URL in a browser
4. You should see your bot manager! 🎉

**Your permanent URL will always be the same**, even after restarting!

---

## Running on Startup

### Windows - Create Batch Files

**1. Create `start-bot.bat`:**

```batch
@echo off
echo Starting Discord Event Bot...
start "Discord Bot" cmd /k node bot.js
timeout /t 3
start "Web Server" cmd /k node web-server.js
timeout /t 3
start "Cloudflare Tunnel" cmd /k cloudflared.exe tunnel run discord-bot
echo.
echo ============================================
echo All services started!
echo ============================================
echo Discord Bot: Running
echo Web Server: http://localhost:3000
echo Remote Access: https://your-tunnel-id.cfargotunnel.com
echo ============================================
pause
```

**2. Save this file in your bot folder**

**3. Double-click `start-bot.bat` to start everything at once!**

**To run on Windows startup:**
1. Press `Win + R`
2. Type: `shell:startup`
3. Copy your `start-bot.bat` to this folder
4. Now it runs automatically when Windows starts!

### Mac/Linux - Create Shell Script

**1. Create `start-bot.sh`:**

```bash
#!/bin/bash

echo "Starting Discord Event Bot..."

# Start Discord bot in background
node bot.js &
BOT_PID=$!

# Wait a bit
sleep 3

# Start web server in background
node web-server.js &
WEB_PID=$!

# Wait a bit
sleep 3

# Start Cloudflare tunnel (this stays in foreground)
echo "============================================"
echo "All services started!"
echo "============================================"
echo "Discord Bot: Running (PID: $BOT_PID)"
echo "Web Server: http://localhost:3000 (PID: $WEB_PID)"
echo "Remote Access: https://your-tunnel-id.cfargotunnel.com"
echo "============================================"
echo "Press Ctrl+C to stop all services"
echo ""

cloudflared tunnel run discord-bot

# When tunnel stops, kill other processes
kill $BOT_PID $WEB_PID 2>/dev/null
```

**2. Make it executable:**
```bash
chmod +x start-bot.sh
```

**3. Run it:**
```bash
./start-bot.sh
```

**To run on Mac/Linux startup:**

**Mac (launchd):**
Create `~/Library/LaunchAgents/com.discord.bot.plist`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.discord.bot</string>
    <key>ProgramArguments</key>
    <array>
        <string>/path/to/your/start-bot.sh</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
```

Then run:
```bash
launchctl load ~/Library/LaunchAgents/com.discord.bot.plist
```

**Linux (systemd) - Recommended for 24/7 operation:**

This is the **best method** for running on Linux servers or desktops that stay on 24/7.

**Step 1: Create service files**

Create `/etc/systemd/system/discord-bot.service`:
```ini
[Unit]
Description=Discord Event Bot
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/home/youruser/discord-bot
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node /home/youruser/discord-bot/bot.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Create `/etc/systemd/system/discord-web.service`:
```ini
[Unit]
Description=Discord Bot Web Interface
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/home/youruser/discord-bot
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node /home/youruser/discord-bot/web-server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Create `/etc/systemd/system/cloudflared-tunnel.service`:
```ini
[Unit]
Description=Cloudflare Tunnel for Discord Bot
After=network.target discord-bot.service discord-web.service
Wants=discord-bot.service discord-web.service

[Service]
Type=simple
User=youruser
ExecStart=/usr/local/bin/cloudflared tunnel run discord-bot
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Important:** Replace `/home/youruser/discord-bot` with your actual bot directory path, and `youruser` with your Linux username.

**Step 2: Reload systemd and enable services**

```bash
# Reload systemd to recognize new services
sudo systemctl daemon-reload

# Enable services to start on boot
sudo systemctl enable discord-bot
sudo systemctl enable discord-web
sudo systemctl enable cloudflared-tunnel

# Start all services now
sudo systemctl start discord-bot
sudo systemctl start discord-web
sudo systemctl start cloudflared-tunnel
```

**Step 3: Check status**

```bash
# Check individual services
sudo systemctl status discord-bot
sudo systemctl status discord-web
sudo systemctl status cloudflared-tunnel

# Check logs
sudo journalctl -u discord-bot -f          # Follow bot logs
sudo journalctl -u discord-web -f          # Follow web server logs
sudo journalctl -u cloudflared-tunnel -f   # Follow tunnel logs
```

**Managing services:**

```bash
# Stop services
sudo systemctl stop discord-bot
sudo systemctl stop discord-web
sudo systemctl stop cloudflared-tunnel

# Restart services
sudo systemctl restart discord-bot
sudo systemctl restart discord-web
sudo systemctl restart cloudflared-tunnel

# Disable auto-start
sudo systemctl disable discord-bot
sudo systemctl disable discord-web
sudo systemctl disable cloudflared-tunnel

# View recent logs
sudo journalctl -u discord-bot -n 50       # Last 50 lines
sudo journalctl -u discord-web --since today
```

**Linux Alternative: Using screen or tmux**

If you prefer not to use systemd, you can use `screen` or `tmux` to keep processes running:

**Using screen:**
```bash
# Install screen if not installed
sudo apt install screen  # Ubuntu/Debian
sudo yum install screen  # RHEL/CentOS
sudo pacman -S screen    # Arch

# Start bot in screen
screen -S discord-bot
node bot.js
# Press Ctrl+A then D to detach

# Start web server in screen
screen -S discord-web
node web-server.js
# Press Ctrl+A then D to detach

# Start tunnel in screen
screen -S cloudflare
cloudflared tunnel run discord-bot
# Press Ctrl+A then D to detach

# List running screens
screen -ls

# Reattach to a screen
screen -r discord-bot
```

**Using tmux:**
```bash
# Install tmux if not installed
sudo apt install tmux  # Ubuntu/Debian
sudo yum install tmux  # RHEL/CentOS
sudo pacman -S tmux    # Arch

# Start bot in tmux
tmux new -s discord-bot
node bot.js
# Press Ctrl+B then D to detach

# Start web server in tmux
tmux new -s discord-web
node web-server.js
# Press Ctrl+B then D to detach

# Start tunnel in tmux
tmux new -s cloudflare
cloudflared tunnel run discord-bot
# Press Ctrl+B then D to detach

# List running sessions
tmux ls

# Reattach to a session
tmux attach -t discord-bot
```

**Linux startup script with PM2 (Recommended for Node.js):**

PM2 is a production process manager for Node.js applications:

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start your services
pm2 start bot.js --name discord-bot
pm2 start web-server.js --name discord-web

# Start tunnel (create a shell script wrapper)
echo '#!/bin/bash
cloudflared tunnel run discord-bot' > start-tunnel.sh
chmod +x start-tunnel.sh
pm2 start ./start-tunnel.sh --name cloudflare-tunnel

# Save the PM2 configuration
pm2 save

# Generate startup script (runs on boot)
pm2 startup
# Follow the command it outputs (usually requires sudo)

# Manage processes
pm2 list              # List all processes
pm2 logs discord-bot  # View logs
pm2 restart all       # Restart all
pm2 stop all          # Stop all
pm2 delete all        # Remove all
```

### As a System Service (Advanced)

**Windows:**
```bash
cloudflared.exe service install
net start cloudflared
```

**Mac/Linux:**
```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

This runs the tunnel automatically in the background.

---

## Troubleshooting

### "tunnel with name discord-bot already exists"

You already created a tunnel with this name. Either:
- Use a different name: `cloudflared tunnel create discord-bot-2`
- Or delete the old one: `cloudflared tunnel delete discord-bot`
- Or just use the existing one: `cloudflared tunnel run discord-bot`

### "cannot create tunnel: no such tunnel"

List your tunnels:
```bash
cloudflared tunnel list
```

Use the exact name shown in the list.

### "failed to authenticate"

Run the login command again:
```bash
cloudflared tunnel login
```

### Can't access the URL

**Check 1:** Is the web server running?
```bash
node web-server.js
```

**Check 2:** Is the tunnel running?
```bash
cloudflared tunnel run discord-bot
```

**Check 3:** Can you access locally?
- Open: http://localhost:3000
- If this doesn't work, fix your web server first

**Check 4:** Is your firewall blocking port 3000?
- Windows: Allow Node.js through Windows Firewall
- Mac: System Preferences > Security & Privacy > Firewall
- Linux: `sudo ufw allow 3000`

**Check 5:** Are you using the correct URL?
- Check tunnel output for the exact URL
- Make sure you're using `https://` not `http://`

### "This site can't be reached"

Wait 30 seconds and try again. Cloudflare tunnels can take a moment to become active after starting.

### Tunnel keeps disconnecting

This usually happens if:
1. Your internet connection is unstable
2. Your computer goes to sleep
3. The tunnel process crashed

**Solution:** Use the service installation method to auto-restart.

### Getting 502 Bad Gateway

Your web server isn't running. Make sure:
```bash
node web-server.js
```
is running before starting the tunnel.

### Permission denied on Linux/Mac

Add `sudo` to the command:
```bash
sudo cloudflared tunnel run discord-bot
```

Or fix permissions:
```bash
sudo chown -R $USER:$USER ~/.cloudflared
```

### Linux: Port 3000 already in use

Find what's using the port:
```bash
sudo lsof -i :3000
# or
sudo netstat -tulpn | grep 3000
```

Kill the process:
```bash
sudo kill -9 <PID>
```

Or change your port in `.env`:
```env
WEB_PORT=8080
```

### Linux: Firewall blocking access

**Ubuntu/Debian (UFW):**
```bash
sudo ufw allow 3000
sudo ufw status
```

**RHEL/CentOS/Fedora (firewalld):**
```bash
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

**Check if firewall is active:**
```bash
sudo ufw status         # Ubuntu/Debian
sudo firewall-cmd --state  # RHEL/CentOS
```

### Linux: Service won't start

Check logs:
```bash
sudo journalctl -u discord-bot -n 50
sudo journalctl -u cloudflared-tunnel -n 50
```

Check if Node.js is installed:
```bash
node --version
npm --version
```

Check file permissions:
```bash
ls -la /home/youruser/discord-bot/
```

Make sure your user owns the files:
```bash
sudo chown -R youruser:youruser /home/youruser/discord-bot/
```

### Linux: Cloudflared not found after installation

The binary might not be in your PATH. Find it:
```bash
which cloudflared
find / -name cloudflared 2>/dev/null
```

Add to PATH or create symlink:
```bash
sudo ln -s /path/to/cloudflared /usr/local/bin/cloudflared
```

### Linux: SELinux blocking cloudflared (RHEL/CentOS/Fedora)

Temporarily disable to test:
```bash
sudo setenforce 0
```

Check if that fixes it. If yes, create a proper SELinux policy or disable permanently:
```bash
sudo sed -i 's/SELINUX=enforcing/SELINUX=disabled/' /etc/selinux/config
```

Then reboot.

### Linux: Running as non-root user

Best practice is to run as a regular user, not root:

```bash
# Create dedicated user (optional)
sudo useradd -m -s /bin/bash discordbot

# Switch to that user
sudo su - discordbot

# Install bot in their home directory
cd ~
git clone your-repo
cd discord-bot
npm install
```

Then use systemd services with `User=discordbot` in the service files.

---

## Alternative Options

If Cloudflare Tunnel doesn't work for you, here are alternatives:

### 1. localhost.run (Easiest)

No installation required:

```bash
ssh -R 80:localhost:3000 nokey@localhost.run
```

Get instant URL. Changes every restart.

### 2. Serveo

Similar to localhost.run:

```bash
ssh -R 80:localhost:3000 serveo.net
```

### 3. ngrok

Popular alternative to Cloudflare:

1. Sign up: https://ngrok.com/signup
2. Download ngrok
3. Run: `ngrok http 3000`

**Pros:** Well-known, good documentation
**Cons:** Free tier has warning page, URL changes

### 4. Tailscale (Private Access)

For private networks only:

1. Install Tailscale: https://tailscale.com/download
2. Connect all your devices
3. Access via Tailscale IP: `http://100.x.x.x:3000`

**Pros:** Very secure, works anywhere
**Cons:** Need app on all devices, not for public access

### 5. Port Forwarding (Manual)

If you have router access:

1. Set static IP for your computer
2. Forward port 3000 to your computer's IP
3. Find your public IP: https://whatismyipaddress.com
4. Access via: `http://YOUR_PUBLIC_IP:3000`

**Pros:** No third-party service
**Cons:** Exposes your IP, requires router access, no HTTPS

### 6. VPS Hosting (Paid)

Host on a cloud server:

- **DigitalOcean:** $6/month
- **Linode:** $5/month
- **Oracle Cloud:** Free tier available
- **AWS EC2:** Free tier (12 months)

**Pros:** 24/7 uptime, professional, permanent
**Cons:** Costs money (except free tiers), requires server management

---

## Security Considerations

### Is Cloudflare Tunnel Safe?

Yes! It's more secure than port forwarding because:
- Your home IP is never exposed
- All traffic is encrypted (HTTPS)
- No ports open on your router
- Cloudflare DDoS protection included

### Should I Add Authentication?

For public access, consider adding basic authentication:

1. Install package:
   ```bash
   npm install express-basic-auth
   ```

2. Add to `web-server.js`:
   ```javascript
   const basicAuth = require('express-basic-auth');
   
   app.use(basicAuth({
       users: { 'admin': 'your-password-here' },
       challenge: true
   }));
   ```

3. Restart the server

Now users need username/password to access.

### Limit Access to Your Guild

Modify the web server to check if users are in your Discord server before showing data.

---

## Linux VPS/Server Deployment (24/7 Hosting)

Running your Discord bot on a Linux VPS is the most professional and reliable option. Here's a complete setup guide:

### Why Use a Linux VPS?

✅ **24/7 Uptime** - Always online, even when your PC is off  
✅ **Better Performance** - Dedicated resources  
✅ **Professional** - Permanent public URL  
✅ **Reliable** - No home internet issues  
✅ **Cheap** - Starting at $3-5/month, or free with Oracle Cloud  

### Recommended VPS Providers

| Provider | Free Tier | Paid Plans | Best For |
|----------|-----------|------------|----------|
| **Oracle Cloud** | ✅ 2 VMs forever | Free | Best free option |
| **DigitalOcean** | ❌ $200 credit | $6/month | Easiest setup |
| **Linode** | ❌ $100 credit | $5/month | Great support |
| **Vultr** | ❌ | $6/month | Good performance |
| **AWS EC2** | ✅ 12 months | Varies | Complex but powerful |
| **Google Cloud** | ✅ $300 credit | Varies | Good for scale |

### Complete VPS Setup (Ubuntu 22.04)

**Step 1: Create your VPS**

1. Choose a provider (Oracle Cloud for free, DigitalOcean for easy)
2. Create an Ubuntu 22.04 LTS server
3. Note your server's IP address
4. Save your SSH key

**Step 2: Connect via SSH**

```bash
ssh root@your-server-ip
# or
ssh ubuntu@your-server-ip
```

**Step 3: Initial Setup**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (v18 LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version

# Install git
sudo apt install -y git

# Install build tools (needed for some npm packages)
sudo apt install -y build-essential
```

**Step 4: Create Bot User (Security Best Practice)**

```bash
# Create dedicated user
sudo useradd -m -s /bin/bash discordbot

# Add to sudo group (optional, for admin tasks)
sudo usermod -aG sudo discordbot

# Set password
sudo passwd discordbot

# Switch to bot user
sudo su - discordbot
```

**Step 5: Deploy Your Bot**

```bash
# Clone your repository
cd ~
git clone https://github.com/yourusername/discord-event-bot.git
cd discord-event-bot

# Install dependencies
npm install

# Create .env file
nano .env
```

Paste your configuration:
```env
DISCORD_TOKEN=your_token_here
GOOGLE_CREDENTIALS=your_credentials_json
CALENDAR_IDS=primary
WEB_PORT=3000
```

Save with `Ctrl+X`, then `Y`, then `Enter`.

**Step 6: Install Cloudflared**

```bash
# Download cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared

# Verify
cloudflared --version
```

**Step 7: Set Up Cloudflare Tunnel**

```bash
# Login to Cloudflare
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create discord-bot

# Route the tunnel
cloudflared tunnel route dns discord-bot discord-bot
```

**Step 8: Create Systemd Services**

Exit the discordbot user:
```bash
exit  # Back to root/ubuntu user
```

Create Discord bot service:
```bash
sudo nano /etc/systemd/system/discord-bot.service
```

Paste:
```ini
[Unit]
Description=Discord Event Bot
After=network.target

[Service]
Type=simple
User=discordbot
WorkingDirectory=/home/discordbot/discord-event-bot
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node /home/discordbot/discord-event-bot/bot.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Create web server service:
```bash
sudo nano /etc/systemd/system/discord-web.service
```

Paste:
```ini
[Unit]
Description=Discord Bot Web Interface
After=network.target

[Service]
Type=simple
User=discordbot
WorkingDirectory=/home/discordbot/discord-event-bot
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node /home/discordbot/discord-event-bot/web-server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Create Cloudflare tunnel service:
```bash
sudo nano /etc/systemd/system/cloudflared-tunnel.service
```

Paste:
```ini
[Unit]
Description=Cloudflare Tunnel
After=network.target discord-bot.service discord-web.service

[Service]
Type=simple
User=discordbot
ExecStart=/usr/local/bin/cloudflared tunnel run discord-bot
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**Step 9: Enable and Start Services**

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable services (start on boot)
sudo systemctl enable discord-bot
sudo systemctl enable discord-web
sudo systemctl enable cloudflared-tunnel

# Start services
sudo systemctl start discord-bot
sudo systemctl start discord-web
sudo systemctl start cloudflared-tunnel

# Check status
sudo systemctl status discord-bot
sudo systemctl status discord-web
sudo systemctl status cloudflared-tunnel
```

**Step 10: Verify Everything Works**

```bash
# Check if bot is running
sudo systemctl status discord-bot

# View logs
sudo journalctl -u discord-bot -f
sudo journalctl -u discord-web -f
sudo journalctl -u cloudflared-tunnel -f

# Test local web server
curl http://localhost:3000
```

Visit your Cloudflare Tunnel URL - your bot should be accessible! 🎉

### VPS Management Commands

**View logs:**
```bash
# Real-time logs
sudo journalctl -u discord-bot -f
sudo journalctl -u discord-web -f

# Last 100 lines
sudo journalctl -u discord-bot -n 100

# Logs from today
sudo journalctl -u discord-bot --since today

# Logs with errors only
sudo journalctl -u discord-bot -p err
```

**Restart services:**
```bash
sudo systemctl restart discord-bot
sudo systemctl restart discord-web
sudo systemctl restart cloudflared-tunnel
```

**Update your bot:**
```bash
# Switch to bot user
sudo su - discordbot

# Pull latest changes
cd ~/discord-event-bot
git pull

# Install new dependencies (if any)
npm install

# Exit back to root
exit

# Restart services
sudo systemctl restart discord-bot
sudo systemctl restart discord-web
```

**Monitor resource usage:**
```bash
# CPU and memory
htop

# Disk space
df -h

# Check process
ps aux | grep node
```

**Security hardening:**
```bash
# Enable firewall
sudo ufw enable

# Allow SSH
sudo ufw allow ssh

# Allow HTTP/HTTPS (if needed)
sudo ufw allow 80
sudo ufw allow 443

# Check status
sudo ufw status
```

### Oracle Cloud Free Tier Setup

Oracle Cloud offers a generous free tier that's perfect for this bot:

**Free tier includes:**
- 2 AMD-based VMs (1/8 OCPU, 1GB RAM each)
- OR 4 ARM-based VMs (total 24GB RAM)
- 200GB block storage
- 10TB outbound data transfer/month

**Setup steps:**

1. Sign up at: https://www.oracle.com/cloud/free/
2. Create a compute instance (Ubuntu 22.04)
3. Download SSH key
4. Note the public IP
5. Follow the "Complete VPS Setup" steps above

**Oracle Cloud specific notes:**
- Default user is `ubuntu`, not `root`
- Open port 3000 in Oracle Cloud Console → Networking → Security Lists
- Oracle Cloud has strict firewall rules by default

### Automatic Backups

Create a backup script:

```bash
sudo nano /home/discordbot/backup.sh
```

Paste:
```bash
#!/bin/bash
BACKUP_DIR="/home/discordbot/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup events and presets
cd /home/discordbot/discord-event-bot
cp events.json $BACKUP_DIR/events_$DATE.json
cp presets.json $BACKUP_DIR/presets_$DATE.json

# Keep only last 30 days
find $BACKUP_DIR -name "*.json" -mtime +30 -delete

echo "Backup completed: $DATE"
```

Make executable:
```bash
chmod +x /home/discordbot/backup.sh
```

Add to crontab (daily at 3 AM):
```bash
sudo crontab -e
```

Add line:
```
0 3 * * * /home/discordbot/backup.sh
```

---

## FAQ

**Q: Does this cost money?**
A: No! Cloudflare Tunnel is 100% free with no bandwidth limits.

**Q: Will my URL change?**
A: With the permanent setup, no. Your URL stays the same forever.

**Q: Can I use my own domain?**
A: Yes! Add your domain to Cloudflare (free) and use `cloudflared tunnel route dns`

**Q: Does my computer need to stay on?**
A: Yes. The tunnel only works while your computer is running the bot and tunnel.

**Q: Can multiple people access at once?**
A: Yes! No limit on concurrent users.

**Q: Is this legal?**
A: Yes! Cloudflare Tunnel is an official Cloudflare product.

**Q: Can I run multiple tunnels?**
A: Yes! Create different tunnels for different services.

**Q: What if Cloudflare goes down?**
A: Very rare, but you'd lose remote access. Local access would still work.

---

## Advanced: Multiple Services on One Tunnel

You can expose multiple services through one tunnel:

**config.yml:**
```yaml
tunnel: your-tunnel-id
credentials-file: /path/to/credentials.json

ingress:
  - hostname: bot.yourdomain.com
    service: http://localhost:3000
  - hostname: api.yourdomain.com
    service: http://localhost:4000
  - service: http_status:404
```

Now you have:
- `bot.yourdomain.com` → Your bot manager
- `api.yourdomain.com` → Another service

---

## Next Steps

✅ You now have remote access to your bot!

**What's next?**
1. Share your URL with your community
2. Bookmark the URL on your phone
3. Set up auto-start (see "Running on Startup")
4. Consider adding authentication for security
5. Check out the GitHub guide to back up your bot

**Need help?** Check the troubleshooting section or review the main [README.md](README.md)

---

**Congratulations!** Your Discord Event Bot is now accessible from anywhere in the world! 🎉

Share your Cloudflare URL and let your community manage events from wherever they are!
