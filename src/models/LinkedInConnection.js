import mongoose from "mongoose";

const linkedinConnectionSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },

    linkedinId: {
      type: String,
    },

    name: {
      type: String,
    },

    email: {
      type: String,
    },

    picture: {
      type: String,
    },

    accessToken: {
      type: String,
    },

    // Cuando expira el access token (LinkedIn los emite validos ~60 dias).
    // Pasada esta fecha hay que reconectar -- no pedimos refresh token para
    // no complicar el flujo.
    expiresAt: {
      type: Date,
    },

    permissions: [String],

    lastSync: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

linkedinConnectionSchema.index({ customerId: 1 });

export default mongoose.model("LinkedInConnection", linkedinConnectionSchema);
