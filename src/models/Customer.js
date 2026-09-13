import mongoose from "mongoose";

// Un cliente dentro de la cuenta de un usuario (agencia). Toda la actividad
// importada y las metricas cargadas a mano cuelgan de un Customer, nunca
// directo de un User -- asi un mismo usuario puede tener varios clientes,
// cada uno con sus reportes separados.
const customerSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    companyName: { type: String, required: true, trim: true },

    contactEmail: { type: String, default: "" },

    status: {
      type: String,
      default: "active",
    },
  },
  {
    timestamps: true,
  },
);

customerSchema.index({ ownerId: 1 });

export default mongoose.model("Customer", customerSchema);
