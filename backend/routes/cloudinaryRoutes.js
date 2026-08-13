import express from "express";
import { deleteImage } from "../controllers/cloudinaryController.js";

const router = express.Router();

router.post("/delete", deleteImage);

export default router;