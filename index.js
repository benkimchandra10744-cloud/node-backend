import { start, stop } from "./server.js";

let server;

try {
  server = await start();
} catch (error) {
  console.error("Application startup failed:", error.message);
  process.exit(1);
}

async function shutdown(signal) {
  console.log(`${signal} received; shutting down gracefully.`);
  try {
    await stop(server);
    process.exit(0);
  } catch (error) {
    console.error("Graceful shutdown failed:", error.message);
    process.exit(1);
  }
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
