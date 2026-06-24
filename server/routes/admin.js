import express from "express";
import { fixVideoPaths } from "../controllers/admin.js";

const router = express.Router();

// Accept both GET and POST for easier access
router.get("/fix-video-paths", fixVideoPaths);
router.post("/fix-video-paths", fixVideoPaths);

export default router;
