import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    companyName: String,

    contactEmail: String,

    status: {
      type: String,
      default: "active",
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Customer", customerSchema);
