import mongoose from "mongoose";

// Metricas de alcance/audiencia que LinkedIn SI te muestra a vos en "Ver analisis"
// de cada post, pero que no vienen en el export ni en la API basica -- por eso
// se cargan a mano, una vez por post.
const postMetricSchema = new mongoose.Schema(
  {
    // A que cliente pertenece esta metrica -- separa los datos de cada cuenta.
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    postLink: { type: String, default: "" }, // idealmente el mismo link que en LinkedInActivity
    postLabel: { type: String, default: "" }, // texto corto para identificar el post en la lista
    postDate: { type: Date, default: null },

    impressions: { type: Number, default: null },
    membersReached: { type: Number, default: null },
    followerPct: { type: Number, default: null }, // 0-100, % de audiencia que ya te sigue

    reactions: { type: Number, default: null },
    comments: { type: Number, default: null },
    reposts: { type: Number, default: null },

    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

postMetricSchema.index({ customerId: 1, postDate: -1 });

export default mongoose.model("PostMetric", postMetricSchema);
