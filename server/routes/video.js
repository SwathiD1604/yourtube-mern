import express from "express";
import { getallvideo, uploadvideo, downloadvideo, getdownloadedvideos } from "../controllers/video.js";
import upload from "../filehelper/filehelper.js";

const routes = express.Router();

routes.post("/upload", upload.single("file"), uploadvideo);
routes.get("/getall", getallvideo);
routes.post("/download/:id", downloadvideo);
routes.get("/downloaded/:userId", getdownloadedvideos);
export default routes;
