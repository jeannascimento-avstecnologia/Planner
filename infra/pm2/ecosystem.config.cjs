/** PM2: Next.js apenas em localhost (nginx na frente com TLS). */
module.exports = {
  apps: [
    {
      name: "agify",
      cwd: "./apps/web",
      script: "npm",
      args: "start -- -p 3001 -H 127.0.0.1",
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
    },
  ],
};
