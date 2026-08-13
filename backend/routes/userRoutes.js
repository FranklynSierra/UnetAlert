import express from "express";
import { createUser } from "../controllers/userController.js";
import { verifyUser } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", verifyUser, createUser);

export default router;