import mongoose from "mongoose";

// Cuenta de agencia: quien inicia sesion en Faro. Cada User puede administrar
// varios Customer (clientes), y todo lo demas (actividad importada, metricas)
// cuelga de un Customer, nunca directo de un User -- asi separamos "quien
// tiene la cuenta" de "de que cliente son estos datos".
const userSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
