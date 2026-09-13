import mongoose from "mongoose";

// En Vercel cada request puede llegar a una instancia "fria" distinta, asi que
// cacheamos la conexion (y la promesa en curso) para no reconectar en cada
// invocacion y para no disparar conexiones en paralelo durante el arranque.
let connectionPromise = null;

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(process.env.MONGO_URI)
      .then((conn) => {
        console.log("MongoDB conectado");
        return conn;
      })
      .catch((error) => {
        // Si falla, limpiamos la promesa cacheada para poder reintentar en la
        // proxima request en vez de quedar pegados en un error permanente.
        connectionPromise = null;

        console.error("ERROR COMPLETO:");
        console.error(error);

        if (error.syscall === "querySrv" || error.syscall === "queryTxt") {
          console.error(
            "\nEsto casi siempre es un bloqueo de DNS/red hacia Atlas (no un problema de tu codigo ni de Atlas en si):\n" +
              "1) Probá conectarte desde otra red (por ejemplo el hotspot de tu celular) para confirmar si es tu red/ISP el que bloquea las consultas DNS tipo SRV.\n" +
              "2) Si se confirma, la solucion mas robusta es cambiar MONGO_URI en tu .env por el 'standard connection string' (mongodb://... con los 3 hosts del shard) en vez de mongodb+srv://, asi evitas por completo la consulta SRV. Lo conseguis en Atlas: Database -> Connect -> Drivers.\n",
          );
        }

        throw error;
      });
  }

  return connectionPromise;
};
