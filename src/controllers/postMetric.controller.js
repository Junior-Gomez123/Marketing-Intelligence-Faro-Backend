import PostMetric from "../models/PostMetric.js";

const NUMERIC_FIELDS = ["impressions", "membersReached", "followerPct", "reactions", "comments", "reposts"];

function toNumberOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export const createPostMetric = async (req, res) => {
  try {
    const body = req.body || {};

    const doc = {
      postLink: body.postLink || "",
      postLabel: body.postLabel || "",
      postDate: body.postDate ? new Date(body.postDate) : null,
      notes: body.notes || "",
    };

    for (const field of NUMERIC_FIELDS) {
      doc[field] = toNumberOrNull(body[field]);
    }

    if (doc.followerPct !== null) {
      doc.followerPct = Math.min(100, Math.max(0, doc.followerPct));
    }

    const created = await PostMetric.create(doc);
    res.status(201).json(created);
  } catch (error) {
    console.error("Error creando metrica de post:", error);
    res.status(500).json({ error: "Error guardando la metrica" });
  }
};

export const listPostMetrics = async (req, res) => {
  try {
    const items = await PostMetric.find({}).sort({ postDate: -1, createdAt: -1 });
    res.json({ items, total: items.length });
  } catch (error) {
    console.error("Error listando metricas de posts:", error);
    res.status(500).json({ error: "Error consultando las metricas" });
  }
};

export const deletePostMetric = async (req, res) => {
  try {
    await PostMetric.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    console.error("Error borrando metrica de post:", error);
    res.status(500).json({ error: "Error borrando la metrica" });
  }
};
