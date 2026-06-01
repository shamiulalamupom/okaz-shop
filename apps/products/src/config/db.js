import mongoose from "mongoose";

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI n'est pas défini");
  }

  mongoose.connection.on("connected", () =>
    console.log("MongoDB connecté ✅")
  );
  mongoose.connection.on("error", (error) =>
    console.error("Erreur de connexion MongoDB :", error.message)
  );
  mongoose.connection.on("disconnected", () =>
    console.warn("MongoDB déconnecté ⚠️")
  );

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      return;
    } catch (error) {
      console.error(
        `Erreur MongoDB (tentative ${attempt}/${MAX_RETRIES}) :`,
        error.message
      );
      if (attempt === MAX_RETRIES) throw error;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
};

export default connectDB;
