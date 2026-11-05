import { Router } from "express";
import { login, signup } from "../controllers/authController.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/auth/signup", signup);
router.post("/auth/login", login);
router.get("/dashboard", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.auth.sub).select("name email createdAt");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json({ message: "Welcome to your dashboard", user });
  } catch (error) {
    return next(error);
  }
});

export default router;
