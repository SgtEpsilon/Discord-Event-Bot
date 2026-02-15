// ecosystem.config.js - PM2 Configuration with URL display
module.exports = {
  apps: [
    {
      name: 'discord-event-bot',
      script: 'index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/bot-error.log',
      out_file: './logs/bot-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Post-start hook to display status
      post_start: 'echo "📡 Discord Bot Started"'
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
        WEB_PORT: process.env.WEB_PORT || 3000
      },
      error_file: './logs/web-error.log',
      out_file: './logs/web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Post-start hook to display URL
      post_start: 'echo "🌐 Web Server: http://localhost:' + (process.env.WEB_PORT || 3000) + '"'
    }
  ],
  
  // Deploy configuration (optional)
  deploy: {
    production: {
      user: 'node',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'git@github.com:repo.git',
      path: '/var/www/production',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production'
    }
  }
};
