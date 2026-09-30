import { app } from './app.js';
import { config } from './config/env.js';

const server = app.listen(config.port, () => {
  console.log(`[HookRelay Server] running in ${config.nodeEnv} mode on port ${config.port}`);
  console.log(
    `[HookRelay Server] Health check available at http://localhost:${config.port}/health`,
  );
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('[HookRelay Server] SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('[HookRelay Server] HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[HookRelay Server] SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('[HookRelay Server] HTTP server closed');
    process.exit(0);
  });
});

export default server;
