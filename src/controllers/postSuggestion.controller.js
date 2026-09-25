import { getPostSuggestion } from "../services/postSuggestion.service.js";

export const suggestPost = async (req, res) => {
  try {
    const result = await getPostSuggestion(req.customer._id, req.customer.companyName);
    res.json(result);
  } catch (error) {
    console.error("Error generando sugerencia de post:", error.response?.data || error.message);
    res.status(500).json({ error: "No se pudo generar una sugerencia de post." });
  }
};
