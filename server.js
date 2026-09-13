// Entry point unico, tanto en local (node server.js / npm run dev) como en
// Vercel. Vercel detecta automaticamente el backend de Express: busca un
// archivo en la raiz (server.js, index.js o app.js) que importe "express"
// DIRECTAMENTE y lo convierte en una funcion serverless (no hace falta
// vercel.json ni carpeta /api para esto).
// https://vercel.com/docs/frameworks/backend/express
//
// Por eso toda la configuracion de la app vive en este mismo archivo: si
// server.js solo reexporta una app armada en otro lado, Vercel no lo
// reconoce como entrypoint valido (eso fue justo lo que fallo en el deploy).
import dns from "dns";
dns.setServers(["1.1.1.1", "8.8.8.8"]);
dns.setDefaultResultOrder("ipv4first");

import "dotenv/config";
import express from "express";
import cors from "cors";

import testRoutes from "./src/routes/test.routes.js";
import linkedinRoutes from "./src/routes/linkedin.routes.js";
import { connectDB } from "./src/config/db.js";

const app = express();

app.use(cors());
app.use(express.json());

// Empezamos a conectar apenas arranca el proceso/funcion (no bloqueante) y
// ademas esperamos la conexion antes de resolver cada request: en un cold
// start de Vercel la primera request puede llegar antes de que Mongo
// termine de conectar, y sin este gate esa request fallaria con un error
// raro en vez de un mensaje claro.
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

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Servidor corriendo en puerto ${port}`);
});
