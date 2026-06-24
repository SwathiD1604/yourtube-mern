import express from "express";
import { fixVideoPaths } from "../controllers/admin.js";

const router = express.Router();

router.post("/fix-video-paths", fixVideoPaths);

export default router;
