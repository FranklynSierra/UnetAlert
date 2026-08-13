import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

import { configureCloudinary } from "./config/cloudinary.js";

import userRoutes from "./routes/userRoutes.js";
import cloudinaryRoutes from "./routes/cloudinaryRoutes.js";

configureCloudinary();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/cloudinary", cloudinaryRoutes);

app.listen(3001, () => {
    console.log("Servidor iniciado");
});