import { randomUUID } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import Image from "../models/Image.js";
import User from "../models/User.js";
import {
  createImageUrl,
  deleteFromS3,
  getImageStorageErrorMessage,
  uploadToS3
} from "../services/s3.js";

const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"]
]);

async function renderDashboard(req, res, options = {}) {
  const [user, images] = await Promise.all([
    User.findById(req.auth.sub).select("name email"),
    Image.find({ owner: req.auth.sub }).sort({ createdAt: -1 }).lean()
  ]);
  if (!user) {
    return res.status(404).render("error", {
      title: "Account not found",
      message: "Your account could not be found. Please sign in again."
    });
  }

  const imagesWithUrls = await Promise.all(
    images.map(async (image) => ({
      ...image,
      previewUrl: await createImageUrl(image.key)
    }))
  );
  return res.status(options.status || 200).render("dashboard", {
    user,
    images: imagesWithUrls,
    error: options.error || null
  });
}

export async function dashboard(req, res, next) {
  try {
    await renderDashboard(req, res);
  } catch (error) {
    next(error);
  }
}

export async function uploadImage(req, res, next) {
  let key;
  let uploadedToS3 = false;
  try {
    if (!req.file) {
      return await renderDashboard(req, res, {
        status: 400,
        error: "Choose an image to upload."
      });
    }

    const detectedType = await fileTypeFromBuffer(req.file.buffer);
    const extension = detectedType && allowedTypes.get(detectedType.mime);
    if (!extension) {
      return await renderDashboard(req, res, {
        status: 400,
        error: "Upload a valid JPEG, PNG, WebP, or GIF image."
      });
    }

    key = `${req.auth.sub}/${randomUUID()}.${extension}`;
    await uploadToS3({
      key,
      buffer: req.file.buffer,
      contentType: detectedType.mime
    });
    uploadedToS3 = true;
    await Image.create({
      owner: req.auth.sub,
      key,
      filename: req.file.originalname.slice(0, 200),
      contentType: detectedType.mime,
      size: req.file.size
    });

    return res.redirect("/dashboard");
  } catch (error) {
    if (uploadedToS3 && key) {
      try {
        await deleteFromS3(key);
      } catch (cleanupError) {
        console.error("Could not remove incomplete S3 upload:", cleanupError.message);
      }
    }
    const message = getImageStorageErrorMessage(error);
    if (message) {
      return res.status(503).render("error", {
        title: "Image storage needs setup",
        message
      });
    }
    return next(error);
  }
}
