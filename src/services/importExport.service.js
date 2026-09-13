import crypto from "crypto";
import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync";
import LinkedInActivity from "../models/LinkedInActivity.js";

// Mapa de "que archivo del export corresponde a que tipo de actividad".
// Los nombres pueden variar segun el idioma/version del export de LinkedIn, por eso
// hacemos match por nombre base sin extension, en minusculas, ignorando espacios/guiones.
// LinkedIn a veces agrega un sufijo numerico (tu member id) al nombre del archivo,
// ej. "Reactions_1206478979.csv" en vez de "Reactions.csv". Por eso matcheamos por
// PREFIJO del nombre normalizado, no por igualdad exacta.
const FILE_TYPE_PREFIXES = [
  { prefix: "shares", type: "post" },
  { prefix: "posts", type: "post" },
  { prefix: "comments", type: "comment" },
  { prefix: "reactions", type: "reaction" },
  { prefix: "likes", type: "reaction" },
];

function resolveType(normalizedKey) {
  const match = FILE_TYPE_PREFIXES.find(({ prefix }) => normalizedKey.startsWith(prefix));
  return match ? match.type : null;
}

function normalizeFileKey(entryName) {
  const base = entryName.split("/").pop().split("\\").pop();
  const withoutExt = base.replace(/\.csv$/i, "");
  return withoutExt.toLowerCase().replace(/[\s_-]/g, "");
}

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

// Busca un valor en la fila probando varios nombres de columna posibles,
// sin importar mayusculas/minusculas ni espacios.
function pickField(row, candidates) {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const normalizedCandidate = candidate.toLowerCase().replace(/[\s_-]/g, "");
    const foundKey = keys.find(
      (k) => k.toLowerCase().replace(/[\s_-]/g, "") === normalizedCandidate,
    );
    if (foundKey && row[foundKey]) return row[foundKey].trim();
  }
  return "";
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function normalizeRow(type, row) {
  if (type === "post") {
    return {
      occurredAt: parseDate(pickField(row, ["Date", "ShareDate", "Fecha"])),
      text: pickField(row, ["ShareCommentary", "Commentary", "Share Commentary", "Text"]),
      link: pickField(row, ["ShareLink", "SharedUrl", "Share Link", "Link"]),
      mediaUrl: pickField(row, ["MediaUrl", "Media Url"]),
      visibility: pickField(row, ["Visibility"]),
      reactionType: "",
    };
  }
  if (type === "comment") {
    return {
      occurredAt: parseDate(pickField(row, ["Date", "Fecha"])),
      text: pickField(row, ["Message", "Comment", "Text"]),
      link: pickField(row, ["Link", "Url"]),
      mediaUrl: "",
      visibility: "",
      reactionType: "",
    };
  }
  // reaction
  return {
    occurredAt: parseDate(pickField(row, ["Date", "Fecha"])),
    text: "",
    link: pickField(row, ["Link", "Url"]),
    mediaUrl: "",
    visibility: "",
    reactionType: pickField(row, ["Type", "ReactionType"]),
  };
}

// El hash de dedupe incluye el customerId para que dos clientes distintos
// nunca se pisen entre si aunque importen filas con contenido identico.
function makeDedupeKey(customerId, type, row) {
  const hash = crypto.createHash("sha1");
  hash.update(String(customerId) + "|" + type + "|" + JSON.stringify(row));
  return hash.digest("hex");
}

/**
 * Procesa el ZIP del export de LinkedIn ("Get a copy of your data").
 * @param {Buffer} zipBuffer
 * @param {string} customerId - a que cliente pertenece este import
 * @param {string|null} connectionId
 * @returns {Promise<object>} resumen del import
 */
export async function importLinkedInExport(zipBuffer, customerId, connectionId = null) {
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries().filter((e) => !e.isDirectory);

  const importBatchId = crypto.randomUUID();
  const filesInZip = entries.map((e) => e.entryName);

  const summary = {
    importBatchId,
    filesInZip,
    matched: {},
    inserted: {},
    skippedFiles: [],
  };

  const bulkOps = [];

  for (const entry of entries) {
    if (!/\.csv$/i.test(entry.entryName)) continue;

    const key = normalizeFileKey(entry.entryName);
    const type = resolveType(key);

    if (!type) {
      summary.skippedFiles.push(entry.entryName);
      continue;
    }

    summary.matched[type] = entry.entryName;

    const raw = stripBom(zip.readAsText(entry, "utf8"));
    if (!raw.trim()) continue;

    let rows;
    try {
      rows = parse(raw, {
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true,
        trim: true,
      });
    } catch (err) {
      summary.skippedFiles.push(`${entry.entryName} (error de parseo: ${err.message})`);
      continue;
    }

    for (const row of rows) {
      const normalized = normalizeRow(type, row);
      const dedupeKey = makeDedupeKey(customerId, type, row);

      bulkOps.push({
        updateOne: {
          filter: { dedupeKey },
          update: {
            $setOnInsert: {
              customerId,
              connectionId,
              type,
              ...normalized,
              raw: row,
              dedupeKey,
              importBatchId,
              source: "self-export",
            },
          },
          upsert: true,
        },
      });

      summary.inserted[type] = (summary.inserted[type] || 0) + 1;
    }
  }

  if (bulkOps.length > 0) {
    // en tandas de 500 para no mandar un payload gigante de una sola vez
    const chunkSize = 500;
    for (let i = 0; i < bulkOps.length; i += chunkSize) {
      await LinkedInActivity.bulkWrite(bulkOps.slice(i, i + chunkSize), { ordered: false });
    }
  }

  return summary;
}
