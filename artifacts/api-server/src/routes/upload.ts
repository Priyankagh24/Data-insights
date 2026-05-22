import { Router } from "express";
import multer from "multer";
import { runCleaningPipeline } from "../data/pipeline";
import { logger } from "../lib/logger";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

router.post("/", upload.single("file"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ success: false, message: "No file uploaded" });
    return;
  }

  const { originalname, buffer, size } = req.file;
  req.log.info({ filename: originalname, size }, "Running cleaning pipeline");

  try {
    const result = runCleaningPipeline(buffer, originalname);
    req.log.info({ clean: result.clean_rows, excluded: result.excluded_rows }, "Pipeline complete");
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Pipeline error");
    res.status(500).json({ success: false, message: "Pipeline failed — check server logs." });
  }
});

export default router;
