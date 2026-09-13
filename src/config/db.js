import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB conectado");
  } catch (error) {
    console.error("ERROR COMPLETO:");
    console.error(error);

    if (error.syscall === "querySrv" || error.syscall === "queryTxt") {
      console.error(
        "\nEsto casi siempre es un bloqueo de DNS/red hacia Atlas (no un problema de tu codigo ni de Atlas en si):\n" +
          "1) Probá conectarte desde otra red (por ejemplo el hotspot de tu celular) para confirmar si es tu red/ISP el que bloquea las consultas DNS tipo SRV.\n" +
          "2) Si se confirma, la solucion mas robusta es cambiar MONGO_URI en tu .env por el 'standard connection string' (mongodb://... con los 3 hosts del shard) en vez de mongodb+srv://, asi evitas por completo la consulta SRV. Lo conseguis en Atlas: Database -> Connect -> Drivers.\n",
      );
    }
  }
};
