import { Router } from "express";
import {
  login,
  logout,
  showLogin,
  showSignup,
  signup
} from "../controllers/authController.js";
import { loginLimiter, signupLimiter } from "../middleware/rateLimiters.js";

const router = Router();

router.get("/login", showLogin);
router.post("/login", loginLimiter, login);
router.get("/signup", showSignup);
router.post("/signup", signupLimiter, signup);
router.post("/logout", logout);

export default router;
