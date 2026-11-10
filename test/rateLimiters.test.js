import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import test from "node:test";
import { createRateLimiter } from "../middleware/rateLimiters.js";

test("rate limiter rejects requests after the configured limit", async () => {
  const app = express();
  app.set("trust proxy", 0);
  app.get(
    "/api/limited",
    createRateLimiter({
      windowMs: 60_000,
      limit: 2,
      message: "Too many test requests.",
      prefix: "test:rate-limit:"
    }),
    (_req, res) => res.json({ status: "ok" })
  );

  assert.equal((await request(app).get("/api/limited")).status, 200);
  assert.equal((await request(app).get("/api/limited")).status, 200);

  const blocked = await request(app).get("/api/limited");
  assert.equal(blocked.status, 429);
  assert.deepEqual(blocked.body, { error: "Too many test requests." });
});
