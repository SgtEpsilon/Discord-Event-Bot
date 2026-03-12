// ecosystem.config.js - PM2 Configuration
// SECRETS_PASSWORD is the master password for data/secrets.enc
// Change this to whatever password you set when running: node setup-secrets.js

module.exports = {
  apps: [
    {
      name: 'discord-event-bot',
      script: 'src/bot.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        SECRETS_PASSWORD: 'password'   // ← change this to your actual master password
      },
      error_file: './logs/bot-error.log',
      out_file: './logs/bot-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    {
      name: 'web-server',
      script: 'web-server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        WEB_PORT: 3031,
        SECRETS_PASSWORD: 'password'   // ← change this to your actual master password
      },
      error_file: './logs/web-error.log',
      out_file: './logs/web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
