const express = require("express");
const multer = require("multer");
const config = require("../config");
const { uploadModel, translateModel, getManifest } = require("../services/aps");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const FIXED_FILENAME = "bo5_model.dwg";

function safeBase64(str) {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

const FIXED_URN = safeBase64(
  `urn:adsk.objects:os.object:${config.apsBucket}/${FIXED_FILENAME}`,
);

// Admin Authorization Middleware Check
function requireAdmin(req, res, next) {
  const secret = req.headers["x-admin-secret"];
  if (!secret || secret !== config.adminSecretKey) {
    return res
      .status(403)
      .json({ error: "Unauthorized admin access attempt." });
  }
  next();
}

router.post(
  "/api/models/upload",
  requireAdmin,
  upload.single("model"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded." });
      }

      const ossObject = await uploadModel(req.file.buffer, FIXED_FILENAME);

      const urn = safeBase64(ossObject.objectId);

      await translateModel(urn);

      res.json({
        message: "Model uploaded successfully. Translation started.",
        urn: urn,
      });
    } catch (err) {
      next(err);
    }
  },
);

router.get("/api/models/bo5/status", async (req, res, next) => {
  try {
    const manifest = await getManifest(FIXED_URN);
    if (!manifest) {
      return res.json({ status: "not_found", progress: "0%" });
    }
    res.json({
      status: manifest.status,
      progress: manifest.progress,
      urn: FIXED_URN,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
