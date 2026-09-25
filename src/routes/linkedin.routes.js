import express from "express";
import { linkedinCallback } from "../controllers/linkedin.controller.js";

// Callback publico de LinkedIn OAuth (la URL de vuelta que LinkedIn conoce,
// fija en LINKEDIN_REDIRECT_URI). El "conectar" en si -- pedir la URL de
// autorizacion -- vive en linkedinData.routes.js, atado a un cliente
// especifico y protegido por requireAuth + loadOwnedCustomer, porque cada
// cliente conecta su propia cuenta de LinkedIn.
const router = express.Router();

router.get("/callback", linkedinCallback);

export default router;
