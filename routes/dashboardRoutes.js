import { Router } from "express";
import multer from "multer";
import { dashboard, uploadImage } from "../controllers/dashboardController.js";
import { requireAuth } from "../middleware/auth.js";
import { uploadLimiter } from "../middleware/rateLimiters.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }
});

router.get("/dashboard", requireAuth, dashboard);
router.post(
  "/dashboard/images",
  requireAuth,
  uploadLimiter,
  upload.single("image"),
  uploadImage
);

export default router;
