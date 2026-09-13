import { MongoClient } from "mongodb";
import "dotenv/config";

const client = new MongoClient(process.env.MONGO_URI);

try {
  console.log("Intentando conectar...");
  await client.connect();
  console.log("✅ Conectado correctamente");
  await client.close();
} catch (err) {
  console.error("❌ Error:");
  console.error(err);
}