import mongoose from "mongoose";

// Actividad importada desde el export oficial de LinkedIn ("Get a copy of your data").
// OJO: Shares.csv son TUS publicaciones. Reactions.csv y Comments.csv son reacciones/
// comentarios que TU hiciste en publicaciones de otros -- LinkedIn no exporta quien
// reacciono o comento en TUS publicaciones (esa data no existe en el archivo oficial).
const linkedInActivitySchema = new mongoose.Schema(
  {
    // A que cliente pertenece este registro -- separa los datos de cada cuenta.
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    connectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LinkedInConnection",
      default: null,
    },

    type: {
      type: String,
      enum: ["post", "comment", "reaction"],
      required: true,
    },

    occurredAt: { type: Date, default: null },

    text: { type: String, default: "" }, // texto del post o del comentario
    link: { type: String, default: "" }, // url del post original (o del propio post)
    reactionType: { type: String, default: "" }, // LIKE, PRAISE, EMPATHY, etc.
    visibility: { type: String, default: "" },
    mediaUrl: { type: String, default: "" },

    source: { type: String, default: "self-export" },
    importBatchId: { type: String, default: null },

    // Fila original tal como vino del CSV, por si el mapeo de columnas no capturo algo.
    raw: { type: mongoose.Schema.Types.Mixed, default: null },

    // Hash de deduplicacion (incluye el cliente) para poder re-importar el mismo
    // export sin duplicar filas, sin que dos clientes distintos se pisen entre si.
    dedupeKey: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

linkedInActivitySchema.index({ customerId: 1, type: 1, occurredAt: -1 });

export default mongoose.model("LinkedInActivity", linkedInActivitySchema);
