import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import helmet from "helmet";
import "dotenv/config";

const app = express();

// Security headers
app.use(helmet());

// Parse incoming JSON requests
app.use(express.json({ limit: "20kb" }));

// JWT secret
const secret = process.env.JWT_SECRET;

if (!secret || secret.length < 32) {
throw new Error(
"Set a JWT_SECRET containing at least 32 characters."
);
}

// MongoDB User model
const User = mongoose.model(
"User",
new mongoose.Schema(
{
name: {
type: String,
required: true,
trim: true
},
email: {
type: String,
required: true,
unique: true,
lowercase: true,
trim: true
},
passwordHash: {
type: String,
required: true
}
},
{ timestamps: true }
)
);

// 1. Health-check endpoint
app.get("/health", (_req, res) => {
res.json({
status: "ok"
});
});

// 2. User registration
app.post("/api/auth/signup", async (req, res, next) => {
try {
const { name, email, password } = req.body;

if (
  typeof name !== "string" ||
  !name.trim() ||
  name.trim().length > 100 ||
  typeof email !== "string" ||
  !email.trim() ||
  email.trim().length > 254 ||
  typeof password !== "string" ||
  password.length < 12 ||
  password.length > 72
) {
  return res.status(400).json({
    error:
      "Provide a valid name, email and password between 12 and 72 characters."
  });
}
const normalizedEmail = email.trim().toLowerCase();
const passwordHash = await bcrypt.hash(password, 12);
const user = await User.create({
  name: name.trim(),
  email: normalizedEmail,
  passwordHash
});
return res.status(201).json({
  message: "User registered successfully",
  user: {
    id: user.id,
    name: user.name,
    email: user.email
  }
});

} catch (error) {
if (error.code === 11000) {
return res.status(409).json({
error: "Email already registered"
});
}

next(error);

}
});

// 3. User login
app.post("/api/auth/login", async (req, res, next) => {
try {
const email =
typeof req.body?.email === "string"
? req.body.email.trim().toLowerCase()
: "";

const password =
  typeof req.body?.password === "string"
    ? req.body.password
    : "";
const user = await User.findOne({ email });
if (
  !user ||
  !(await bcrypt.compare(password, user.passwordHash))
) {
  return res.status(401).json({
    error: "Invalid email or password"
  });
}
const token = jwt.sign(
  { sub: user.id },
  secret,
  { expiresIn: "1h" }
);
return res.json({
  message: "Login successful",
  token,
  user: {
    id: user.id,
    name: user.name,
    email: user.email
  }
});

} catch (error) {
next(error);
}
});

// JWT authentication middleware
function auth(req, res, next) {
const authorization = req.headers.authorization || "";
const [scheme, token] = authorization.split(" ");

if (scheme !== "Bearer" || !token) {
return res.status(401).json({
error: "Authentication required"
});
}

try {
req.auth = jwt.verify(token, secret);
next();
} catch {
return res.status(401).json({
error: "Invalid or expired token"
});
}
}

// 4. Protected dashboard
app.get("/api/dashboard", auth, async (req, res, next) => {
try {
const user = await User.findById(req.auth.sub)
.select("name email createdAt");

if (!user) {
  return res.status(404).json({
    error: "User not found"
  });
}
return res.json({
  message: "Welcome to your dashboard",
  user
});

} catch (error) {
next(error);
}
});

// Handle unknown routes
app.use((_req, res) => {
res.status(404).json({
error: "Route not found"
});
});

// Central error handler
app.use((error, _req, res, _next) => {
console.error("Request failed:", error.message);

if (res.headersSent) {
return;
}

return res.status(500).json({
error: "Internal server error"
});
});

// Start the application after connecting to MongoDB
const port = Number(process.env.PORT || 3000);

async function start() {
if (!process.env.MONGODB_URI) {
throw new Error("MONGODB_URI is missing.");
}

await mongoose.connect(process.env.MONGODB_URI);
console.log("DATABASE IS CONNECTED");

app.listen(port, "127.0.0.1", () => {
console.log(`API listening on ${port}`);
});
}

start().catch((error) => {
console.error("Application startup failed:", error.message);
process.exit(1);
});
