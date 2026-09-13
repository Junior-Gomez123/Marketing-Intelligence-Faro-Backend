import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    picture: String,
    linkedinId: String,
    accessToken: String,
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
