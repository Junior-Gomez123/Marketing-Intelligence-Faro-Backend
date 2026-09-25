import Anthropic from "@anthropic-ai/sdk";
import { getRecommendations } from "./recommendation.service.js";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

let anthropicClient = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

// Elige un solo angulo/tema para sugerir, reusando las mismas
// recomendaciones basadas en reglas que ya calculamos para el reporte:
// prioriza la primera mejora pendiente (mismo orden que se muestra en
// "Lo que podrias mejorar"); si no hay ninguna, refuerza la primer
// fortaleza; si no hay datos, un angulo generico.
function pickAngle({ strengths, improvements }) {
  if (improvements.length > 0) {
    return { basedOn: "improvement", item: improvements[0] };
  }
  if (strengths.length > 0) {
    return { basedOn: "strength", item: strengths[0] };
  }
  return {
    basedOn: "generic",
    item: {
      title: "Comparti un aprendizaje reciente",
      detail: "Todavia no hay suficiente actividad importada para detectar un patron especifico.",
    },
  };
}

function buildPrompt({ companyName, angle }) {
  const contexto =
    angle.basedOn === "improvement"
      ? `Un area a mejorar detectada en su actividad de LinkedIn: "${angle.item.title}" (${angle.item.detail})`
      : angle.basedOn === "strength"
        ? `Una fortaleza detectada en su actividad de LinkedIn que conviene reforzar: "${angle.item.title}" (${angle.item.detail})`
        : "Todavia no hay datos suficientes, asi que sugeri un tema general y util para arrancar a publicar.";

  return `Sos un asistente de marketing de contenido en LinkedIn para "${companyName || "una empresa"}".

${contexto}

Redacta UN borrador de publicacion para LinkedIn en español, en primera persona (tono profesional pero cercano, como si lo escribiera una persona real, no una marca robotica). Entre 500 y 900 caracteres. Sin hashtags en exceso (maximo 2-3, al final, opcionales). Sin emojis en exceso (maximo 1-2). Que termine invitando a comentar o compartir una opinion. No inventes datos, cifras ni logros especificos de la empresa -- dejalo generico y facil de personalizar antes de publicar.

Responde SOLO con el texto del post, sin explicaciones ni comillas alrededor.`;
}

export async function getPostSuggestion(customerId, companyName) {
  const reco = await getRecommendations(customerId);
  const angle = pickAngle(reco);

  const client = getClient();
  let draftText;
  let aiGenerated = false;

  if (client) {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 500,
      messages: [{ role: "user", content: buildPrompt({ companyName, angle }) }],
    });

    draftText = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();
    aiGenerated = true;
  } else {
    // Sin ANTHROPIC_API_KEY configurada todavia: devolvemos la idea igual,
    // sin redaccion de IA, para que la funcion no se rompa.
    draftText = `${angle.item.title}. ${angle.item.detail}`;
  }

  return {
    angle: angle.item.title,
    angleDetail: angle.item.detail,
    basedOn: angle.basedOn,
    draftText,
    aiGenerated,
  };
}
