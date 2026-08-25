module.exports = {
  apps: [
    {
      name: 'lerapay-backend',
      script: 'dist/main.js',
      watch: false,
      restart_delay: 3000,
      max_restarts: 10,
      env: { NODE_ENV: 'production', PORT: 3000 },
      log_file: './logs/lerapay-combined.log',
      out_file: './logs/lerapay-out.log',
      error_file: './logs/lerapay-error.log',
      time: true,
    },
  ],
};
