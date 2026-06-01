import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import productRoutes from "./routes/product.routes.js";
import swaggerRouter from "../swagger.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/live", (_req, res) => res.status(200).json({ status: "ok" }));
app.get("/ready", (_req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res
    .status(ready ? 200 : 503)
    .json({ status: ready ? "ok" : "not ready" });
});

app.use("/products", productRoutes);
app.use("/api-docs", swaggerRouter);

const PORT = process.env.PRODUCTS_PORT || process.env.PORT || 4002;

const start = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Products Service en ligne sur le port ${PORT}`);
    });
  } catch (error) {
    console.error("Démarrage impossible :", error.message);
    process.exit(1);
  }
};

start();
