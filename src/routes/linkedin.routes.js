import express from "express";
import { linkedinCallback } from "../controllers/linkedin.controller.js";

// Flujo de "Conectar tu cuenta de LinkedIn" (OAuth) -- un tema aparte del
// login de la app. Sigue sin estar atado a un cliente especifico; no se toco
// al separar los datos por cliente.
const router = express.Router();

router.get("/login", (req, res) => {
  const linkedinURL = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.LINKEDIN_REDIRECT_URI)}&scope=openid%20profile%20email`;

  console.log("URL LinkedIn:");
  console.log(linkedinURL);

  res.redirect(linkedinURL);
});

router.get("/callback", linkedinCallback);

export default router;
