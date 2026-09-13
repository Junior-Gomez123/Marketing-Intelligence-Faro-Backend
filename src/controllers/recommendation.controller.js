import { getRecommendations } from "../services/recommendation.service.js";

export const recommendations = async (req, res) => {
  try {
    const result = await getRecommendations(req.customer._id);
    res.json(result);
  } catch (error) {
    console.error("Error generando recomendaciones:", error);
    res.status(500).json({ error: "Error generando recomendaciones" });
  }
};
