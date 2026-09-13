import { importLinkedInExport } from "../services/importExport.service.js";
import LinkedInActivity from "../models/LinkedInActivity.js";

export const uploadExport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Falta el archivo ZIP (campo 'file')" });
    }

    const connectionId = req.body.connectionId || null;
    const summary = await importLinkedInExport(req.file.buffer, connectionId);

    res.json({ ok: true, summary });
  } catch (error) {
    console.error("Error importando export de LinkedIn:", error);
    res.status(500).json({ error: "Error procesando el archivo", detail: error.message });
  }
};

export const listActivity = async (req, res) => {
  try {
    const { type, from, to, page = 1, limit = 25 } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (from || to) {
      filter.occurredAt = {};
      if (from) filter.occurredAt.$gte = new Date(from);
      if (to) filter.occurredAt.$lte = new Date(to);
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 200);

    const [items, total] = await Promise.all([
      LinkedInActivity.find(filter)
        .sort({ occurredAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      LinkedInActivity.countDocuments(filter),
    ]);

    res.json({ items, total, page: pageNum, limit: limitNum });
  } catch (error) {
    console.error("Error listando actividad:", error);
    res.status(500).json({ error: "Error consultando el historial" });
  }
};

export const activityStats = async (req, res) => {
  try {
    const byType = await LinkedInActivity.aggregate([
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]);

    const byMonth = await LinkedInActivity.aggregate([
      { $match: { occurredAt: { $ne: null } } },
      {
        $group: {
          _id: {
            year: { $year: "$occurredAt" },
            month: { $month: "$occurredAt" },
            type: "$type",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    res.json({ byType, byMonth });
  } catch (error) {
    console.error("Error calculando stats:", error);
    res.status(500).json({ error: "Error calculando estadisticas" });
  }
};
