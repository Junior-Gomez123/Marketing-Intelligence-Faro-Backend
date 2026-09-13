// Punto de entrada para Vercel: Vercel toma cualquier archivo bajo /api que
// exporte un handler (una app de Express sirve) y lo corre como funcion
// serverless. El vercel.json de este proyecto reescribe TODAS las rutas
// hacia esta funcion, para que /linkedin/... y /api/test sigan funcionando
// igual que en local (donde Express las maneja directo sobre el puerto 4000).
import dns from "dns";
dns.setServers(["1.1.1.1", "8.8.8.8"]);
dns.setDefaultResultOrder("ipv4first");

import "dotenv/config";
import express from "express";
import cors from "cors";

import testRoutes from "../src/routes/test.routes.js";
import linkedinRoutes from "../src/routes/linkedin.routes.js";
import { connectDB } from "../src/config/db.js";

const app = express();

app.use(cors());
app.use(express.json());

// Empezamos a conectar apenas arranca la funcion (no bloqueante) y ademas
// esperamos la conexion antes de resolver cada request: en un cold start de
// Vercel la primera request puede llegar antes de que Mongo termine de
// conectar, y sin este gate esas requests fallarian con errores raros.
connectDB().catch(() => {});

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    res.status(500).json({ error: "No se pudo conectar a la base de datos" });
  }
});

app.get("/", (req, res) => {
  res.json({ ok: true, service: "Faro backend" });
});

app.use("/api/test", testRoutes);
app.use("/linkedin", linkedinRoutes);

export default app;
