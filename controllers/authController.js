import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const tokenLifetime = 60 * 60 * 1000;

function createToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, {
    expiresIn: "1h"
  });
}

function setAuthCookie(res, token) {
  res.cookie("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: tokenLifetime,
    path: "/"
  });
}

function clearAuthCookie(res) {
  res.clearCookie("auth_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/"
  });
}

function validateSignup({ name, email, password }) {
  return (
    typeof name === "string" &&
    Boolean(name.trim()) &&
    name.trim().length <= 100 &&
    typeof email === "string" &&
    Boolean(email.trim()) &&
    email.trim().length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    typeof password === "string" &&
    password.length >= 12 &&
    password.length <= 72
  );
}

function isBrowserRequest(req) {
  return !req.originalUrl.startsWith("/api/");
}

export function showLogin(_req, res) {
  res.render("login", { error: null, email: "" });
}

export function showSignup(_req, res) {
  res.render("signup", { error: null, name: "", email: "" });
}

export async function signup(req, res, next) {
  const isBrowser = isBrowserRequest(req);
  try {
    const { name, email, password } = req.body;
    if (!validateSignup({ name, email, password })) {
      const error =
        "Enter your name and email, and a password between 12 and 72 characters.";
      if (isBrowser) {
        return res.status(400).render("signup", {
          error,
          name: typeof name === "string" ? name : "",
          email: typeof email === "string" ? email : ""
        });
      }
      return res.status(400).json({ error });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash
    });

    if (isBrowser) {
      setAuthCookie(res, createToken(user));
      return res.redirect("/dashboard");
    }
    return res.status(201).json({
      message: "User registered successfully",
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    if (error.code === 11000) {
      if (isBrowser) {
        return res.status(409).render("signup", {
          error: "That email is already registered. Try signing in instead.",
          name: req.body.name,
          email: req.body.email
        });
      }
      return res.status(409).json({ error: "Email already registered" });
    }
    return next(error);
  }
}

export async function login(req, res, next) {
  try {
    const isBrowser = isBrowserRequest(req);
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const password =
      typeof req.body?.password === "string" ? req.body.password : "";
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      if (isBrowser) {
        return res.status(401).render("login", {
          error: "Email or password is incorrect.",
          email
        });
      }
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = createToken(user);
    if (isBrowser) {
      setAuthCookie(res, token);
      return res.redirect("/dashboard");
    }
    return res.json({
      message: "Login successful",
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    return next(error);
  }
}

export function logout(_req, res) {
  clearAuthCookie(res);
  res.redirect("/login");
}

export { createToken };
