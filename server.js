import express from "express";
import mongoose from "mongoose";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";
import apiRoutes from "./routes/apiRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import { apiLimiter, connectRateLimitStore } from "./middleware/rateLimiters.js";

const app = express();
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const trustProxyHops = Number(process.env.TRUST_PROXY || 0);

if (!Number.isSafeInteger(trustProxyHops) || trustProxyHops < 0) {
  throw new Error("TRUST_PROXY must be a non-negative integer.");
}

const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32) {
  throw new Error("Set a JWT_SECRET containing at least 32 characters.");
}

app.set("view engine", "ejs");
app.set("views", path.join(currentDirectory, "views"));
app.set("trust proxy", trustProxyHops);
app.use(
  helmet({
    strictTransportSecurity:
      process.env.NODE_ENV === "production" ? undefined : false,
    contentSecurityPolicy: {
      directives: {
        "img-src": ["'self'", "https:"],
        "form-action": ["'self'"]
      }
    }
  })
);
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: false, limit: "20kb" }));
app.use(cookieParser());
app.use(express.static(path.join(currentDirectory, "public")));

app.get("/", (_req, res) => res.redirect("/login"));
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use(authRoutes);
app.use(dashboardRoutes);
app.use("/api", apiLimiter, apiRoutes);

app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Route not found" });
  }
  return res.status(404).render("error", {
    title: "Page not found",
    message: "We couldn't find the page you're looking for."
  });
});

app.use((error, req, res, _next) => {
  console.error("Request failed:", error.message);
  if (res.headersSent) {
    return;
  }

  const status =
    error.name === "MulterError"
      ? error.code === "LIMIT_FILE_SIZE"
        ? 413
        : 400
      : error.statusCode || error.status || 500;
  if (req.path.startsWith("/api/")) {
    return res.status(status).json({
      error: status === 500 ? "Internal server error" : error.message
    });
  }
  return res.status(status).render("error", {
    title: status === 413 ? "Image too large" : "Something went wrong",
    message:
      status === 413 || error.code === "LIMIT_FILE_SIZE"
        ? "Images must be 5 MB or smaller."
        : status >= 500
          ? "Please try again in a moment."
          : error.message
  });
});

const port = Number(process.env.PORT || 3000);

async function start() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing.");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("DATABASE IS CONNECTED");
  await connectRateLimitStore();
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`API listening on ${port}`);
    process.send?.("ready");
  });
  server.on("error", (error) => {
    console.error("HTTP server failed to start:", error.message);
    process.exit(1);
  });
}

const isEntryPoint =
  import.meta.main ??
  (process.argv[1] &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url));

if (isEntryPoint) {
  start().catch((error) => {
    console.error("Application startup failed:", error.message);
    process.exit(1);
  });
}

export default app;
