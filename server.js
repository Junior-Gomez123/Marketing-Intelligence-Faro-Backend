// Entrypoint solo para desarrollo local (npm run dev / node server.js).
// En Vercel, api/index.js es el que se ejecuta como funcion serverless y
// esta app nunca llama a .listen(): la exportamos desde aca para no
// duplicar la configuracion en dos lugares.
import app from "./api/index.js";

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
