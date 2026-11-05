import assert from "node:assert/strict";
import { mock, test } from "node:test";
import User from "../models/User.js";
import { signup } from "../controllers/authController.js";

test("duplicate browser signup renders a useful signup error", async (t) => {
  t.mock.method(User, "create", async () => {
    throw Object.assign(new Error("duplicate email"), { code: 11000 });
  });

  const response = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    render(view, data) {
      this.view = view;
      this.data = data;
      return this;
    }
  };
  let nextError;

  await signup(
    {
      originalUrl: "/signup",
      body: {
        name: "Test User",
        email: "existing@example.test",
        password: "a-long-test-password"
      }
    },
    response,
    (error) => {
      nextError = error;
    }
  );

  assert.equal(nextError, undefined);
  assert.equal(response.statusCode, 409);
  assert.equal(response.view, "signup");
  assert.match(response.data.error, /already registered/);
});
