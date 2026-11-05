
module.exports = {
  apps: [
    {
      name: "node-backend",
      script: "./server.js",
      watch: false,
      autorestart: true,
      env: {
        NODE_ENV: "development"
      }
    }
  ]
};
