module.exports = {
  apps: [
    {
      name: 'md-render-api',
      script: 'npx',
      args: 'tsx src/index.ts',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 8787,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8787,
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
  ],
}
