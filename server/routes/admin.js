import express from "express";
import { fixVideoPaths, showVideoPaths } from "../controllers/admin.js";

const router = express.Router();

// Accept both GET and POST for easier access
router.get("/fix-video-paths", fixVideoPaths);
router.post("/fix-video-paths", fixVideoPaths);

// Show all video paths for debugging
router.get("/show-video-paths", showVideoPaths);

export default router;
