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

    permissions: [String],

    lastSync: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("LinkedInConnection", linkedinConnectionSchema);
