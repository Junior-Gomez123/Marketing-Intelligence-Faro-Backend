import axios from "axios";
import jwt from "jsonwebtoken";
import { getLinkedinProfile } from "../services/linkedin.service.js";
import { linkedinConfig } from "../config/linkedin.js";
import LinkedInConnection from "../models/LinkedInConnection.js";

const LINKEDIN_API_VERSION = "202608";

// El navegador no puede mandar un header Authorization al redirigirse a
// LinkedIn, asi que viajamos el customerId adentro de "state" (firmado, no
// un simple nonce) entre el paso 1 (pedir la URL, autenticado por Bearer) y
// el paso 3 (el callback publico que LinkedIn llama).
function signState(customerId) {
  return jwt.sign({ customerId }, process.env.JWT_SECRET, { expiresIn: "15m" });
}

function readCustomerIdFromState(state) {
  const payload = jwt.verify(state, process.env.JWT_SECRET);
  return payload.customerId;
}

// Devuelve la URL de autorizacion de LinkedIn como JSON (no un redirect):
// el pedido en si va con el Authorization: Bearer normal del login de Faro,
// y es el frontend el que despues navega el navegador a esa URL.
export const getConnectUrl = async (req, res) => {
  const state = signState(req.customer._id.toString());
  const url =
    "https://www.linkedin.com/oauth/v2/authorization" +
    `?response_type=code` +
    `&client_id=${encodeURIComponent(linkedinConfig.clientId)}` +
    `&redirect_uri=${encodeURIComponent(linkedinConfig.redirectUri)}` +
    `&scope=${encodeURIComponent(linkedinConfig.scope)}` +
    `&state=${encodeURIComponent(state)}`;

  res.json({ url });
};

export const linkedinCallback = async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL;
  try {
    const { code, state } = req.query;
    const customerId = readCustomerIdFromState(state);

    const tokenResponse = await axios.post(
      "https://www.linkedin.com/oauth/v2/accessToken",
      null,
      {
        params: {
          grant_type: "authorization_code",
          code,
          client_id: linkedinConfig.clientId,
          client_secret: linkedinConfig.clientSecret,
          redirect_uri: linkedinConfig.redirectUri,
        },
      },
    );

    const { access_token: accessToken, expires_in: expiresIn, scope } = tokenResponse.data;
    const profile = await getLinkedinProfile(accessToken);

    await LinkedInConnection.findOneAndUpdate(
      { customerId },
      {
        customerId,
        linkedinId: profile.sub,
        name: profile.name,
        email: profile.email,
        picture: profile.picture,
        accessToken,
        expiresAt: new Date(Date.now() + (expiresIn || 0) * 1000),
        permissions: scope ? scope.split(" ") : linkedinConfig.scope.split(" "),
        lastSync: new Date(),
      },
      { upsert: true, new: true },
    );

    res.redirect(`${frontendUrl}/historial?linkedin=connected`);
  } catch (error) {
    console.error("Error conectando LinkedIn:", error.response?.data || error.message);
    res.redirect(`${frontendUrl}/historial?linkedin=error`);
  }
};

export const getStatus = async (req, res) => {
  const connection = await LinkedInConnection.findOne({ customerId: req.customer._id });
  if (!connection || !connection.accessToken) {
    return res.json({ connected: false });
  }

  res.json({
    connected: true,
    name: connection.name,
    picture: connection.picture,
    expiresAt: connection.expiresAt,
    expired: connection.expiresAt ? connection.expiresAt.getTime() < Date.now() : false,
  });
};

export const disconnect = async (req, res) => {
  await LinkedInConnection.findOneAndDelete({ customerId: req.customer._id });
  res.json({ ok: true });
};

export const publishPost = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "El texto del post no puede estar vacio." });
    }

    const connection = await LinkedInConnection.findOne({ customerId: req.customer._id });
    if (!connection || !connection.accessToken) {
      return res
        .status(400)
        .json({ error: "Este cliente todavia no conecto su cuenta de LinkedIn." });
    }
    if (connection.expiresAt && connection.expiresAt.getTime() < Date.now()) {
      return res.status(401).json({ error: "La conexion con LinkedIn expiro. Volve a conectarla." });
    }

    const response = await axios.post(
      "https://api.linkedin.com/rest/posts",
      {
        author: `urn:li:person:${connection.linkedinId}`,
        commentary: text,
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      },
      {
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          "LinkedIn-Version": LINKEDIN_API_VERSION,
          "X-Restli-Protocol-Version": "2.0.0",
          "Content-Type": "application/json",
        },
      },
    );

    const postId = response.headers["x-restli-id"] || null;
    res.json({ ok: true, postId });
  } catch (error) {
    console.error("Error publicando en LinkedIn:", error.response?.data || error.message);
    res.status(500).json({
      error:
        error.response?.data?.message ||
        "No se pudo publicar en LinkedIn. Puede que la conexion haya expirado o falte el permiso 'Share on LinkedIn' en la app.",
    });
  }
};
