import express from "express";
import {
  getallvideo,
  uploadvideo,
  downloadvideo,
  getdownloadedvideos
} from "../controllers/video.js";

import upload from "../filehelper/filehelper.js";

const router = express.Router();

// Upload video
router.post("/upload", upload.single("file"), uploadvideo);

// Get all videos (IMPORTANT FIX: safe handler wrapper)
router.get("/getall", async (req, res) => {
  try {
    return await getallvideo(req, res);
  } catch (error) {
    console.log("getallvideo error:", error);
    return res.status(500).json([]);
  }
});

// Download video
router.post("/download/:id", downloadvideo);

// Get downloaded videos
router.get("/downloaded/:userId", getdownloadedvideos);

export default router;