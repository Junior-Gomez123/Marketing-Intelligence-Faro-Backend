import dns from "dns";
dns.setServers(["1.1.1.1", "8.8.8.8"]);
dns.setDefaultResultOrder("ipv4first");

import "dotenv/config";
import express from "express";
import cors from "cors";

import testRoutes from "./src/routes/test.routes.js";
import linkedinRoutes from "./src/routes/linkedin.routes.js";
import { connectDB } from "./src/config/db.js";

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/test", testRoutes);

app.use("/linkedin", linkedinRoutes);

app.listen(4000, () => {
  console.log("Servidor corriendo en puerto 4000");
});
