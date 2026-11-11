
module.exports = {
  apps: [
    {
      name: "node-backend",
      script: "./index.js",
      exec_mode: "cluster",
      instances: 2,
      watch: false,
      autorestart: true,
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
