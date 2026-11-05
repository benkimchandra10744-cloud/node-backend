import { Router } from "express";
import {
  login,
  logout,
  showLogin,
  showSignup,
  signup
} from "../controllers/authController.js";

const router = Router();

router.get("/login", showLogin);
router.post("/login", login);
router.get("/signup", showSignup);
router.post("/signup", signup);
router.post("/logout", logout);

export default router;
