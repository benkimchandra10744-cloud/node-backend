import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";

process.env.JWT_SECRET ||= "test-only-secret-that-is-at-least-32-characters";
const { default: app } = await import("../server.js");

test("health and authentication pages are available", async () => {
  const health = await request(app).get("/health");
  assert.equal(health.status, 200);
  assert.deepEqual(health.body, { status: "ok" });
  assert.equal(health.headers["strict-transport-security"], undefined);

  const login = await request(app).get("/login");
  assert.equal(login.status, 200);
  assert.match(login.text, /Welcome back/);
});

test("dashboard redirects browsers and rejects unauthenticated API requests", async () => {
  const dashboard = await request(app).get("/dashboard");
  assert.equal(dashboard.status, 302);
  assert.equal(dashboard.headers.location, "/login");

  const apiDashboard = await request(app).get("/api/dashboard");
  assert.equal(apiDashboard.status, 401);
  assert.deepEqual(apiDashboard.body, { error: "Authentication required" });
});

test("invalid API signup input keeps the JSON API response shape", async () => {
  const response = await request(app)
    .post("/api/auth/signup")
    .send({ name: "", email: "not-an-email", password: "short" });

  assert.equal(response.status, 400);
  assert.equal(response.type, "application/json");
  assert.match(response.body.error, /name and email/);
});
