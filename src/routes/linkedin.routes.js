import express from "express";
import multer from "multer";

import { linkedinCallback } from "../controllers/linkedin.controller.js";
import {
  uploadExport,
  listActivity,
  activityStats,
} from "../controllers/import.controller.js";
import { recommendations } from "../controllers/recommendation.controller.js";
import {
  createPostMetric,
  listPostMetrics,
  deletePostMetric,
} from "../controllers/postMetric.controller.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB, el export de LinkedIn suele venir liviano
});

router.get("/login", (req, res) => {
  const linkedinURL = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.LINKEDIN_REDIRECT_URI)}&scope=openid%20profile%20email`;

  console.log("URL LinkedIn:");
  console.log(linkedinURL);

  res.redirect(linkedinURL);
});

router.get("/callback", linkedinCallback);

// Import del export oficial de LinkedIn ("Get a copy of your data")
router.post("/import", upload.single("file"), uploadExport);
router.get("/activity", listActivity);
router.get("/activity/stats", activityStats);

// Recomendaciones basadas en reglas sobre la actividad importada
router.get("/recommendations", recommendations);

// Metricas de alcance/audiencia cargadas a mano (impresiones, alcance, % seguidores)
router.post("/post-metrics", createPostMetric);
router.get("/post-metrics", listPostMetrics);
router.delete("/post-metrics/:id", deletePostMetric);

export default router;
