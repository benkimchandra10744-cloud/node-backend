import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ejs from "ejs";
import test from "node:test";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

async function render(view, data) {
  const template = await readFile(path.join(root, "views", `${view}.ejs`), "utf8");
  return ejs.render(template, data);
}

test("login and signup views render their browser forms", async () => {
  const login = await render("login", { error: null, email: "" });
  const signup = await render("signup", { error: null, name: "", email: "" });

  assert.match(login, /action="\/login" method="post"/);
  assert.match(signup, /action="\/signup" method="post"/);
  assert.match(signup, /minlength="12"/);
});

test("dashboard renders an escaped image preview and empty-state-free library", async () => {
  const dashboard = await render("dashboard", {
    user: { name: "Alex" },
    images: [
      {
        filename: "<photo>.png",
        previewUrl: "https://images.example.test/photo.png",
        createdAt: new Date("2026-01-01T00:00:00.000Z")
      }
    ],
    error: null
  });

  assert.match(dashboard, /<img src="https:\/\/images\.example\.test\/photo\.png"/);
  assert.match(dashboard, /&lt;photo&gt;\.png/);
  assert.match(dashboard, /action="\/dashboard\/images"/);
  assert.doesNotMatch(dashboard, /Your library starts here/);
});
