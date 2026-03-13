import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import productRoutes from "./routes/product.routes.js";
//import swaggerRouter from "../swagger.js";

dotenv.config();

const app = express();
connectDB();

app.use(cors());
app.use(express.json());

app.use("/products", productRoutes);
//app.use("/api-docs", swaggerRouter);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Products Service en ligne sur le port ${PORT}`);
});