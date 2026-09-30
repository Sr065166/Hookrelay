import { app } from "./app";
import { config } from './config/env';
import { startWorker, stopWorker } from './worker/index';

const server = app.listen(config.port, () => {
  console.log(`[HookRelay Server] running in ${config.nodeEnv} mode on port ${config.port}`);
  console.log(
    `[HookRelay Server] Health check available at http://localhost:${config.port}/health`,
  );
  if (config.nodeEnv !== 'test') {
    startWorker();
  }
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('[HookRelay Server] SIGTERM signal received: closing HTTP server');
  stopWorker();
  server.close(() => {
    console.log('[HookRelay Server] HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[HookRelay Server] SIGINT signal received: closing HTTP server');
  stopWorker();
  server.close(() => {
    console.log('[HookRelay Server] HTTP server closed');
    process.exit(0);
  });
});

export default server;
