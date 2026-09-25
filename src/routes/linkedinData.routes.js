import express from "express";
import multer from "multer";

import { uploadExport, listActivity, activityStats } from "../controllers/import.controller.js";
import { recommendations } from "../controllers/recommendation.controller.js";
import {
  createPostMetric,
  listPostMetrics,
  deletePostMetric,
} from "../controllers/postMetric.controller.js";
import {
  getConnectUrl,
  getStatus,
  disconnect,
  publishPost,
} from "../controllers/linkedin.controller.js";
import { suggestPost } from "../controllers/postSuggestion.controller.js";

// Montado en server.js como /customers/:customerId -- requireAuth y
// loadOwnedCustomer ya corrieron antes de llegar aca, asi que req.customer
// esta disponible en todos los controllers de abajo.
const router = express.Router({ mergeParams: true });
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB, el export de LinkedIn suele venir liviano
});

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

// Conectar la cuenta de LinkedIn de este cliente (para poder publicar en su
// nombre) y publicar posts sugeridos.
router.get("/linkedin/connect-url", getConnectUrl);
router.get("/linkedin/status", getStatus);
router.delete("/linkedin", disconnect);
router.post("/linkedin/publish", publishPost);

// Sugerencia de proximo post: idea basada en reglas + redaccion con IA.
router.get("/suggestions/post", suggestPost);

export default router;
