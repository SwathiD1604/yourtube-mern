import express from "express";
import { deletecomment, getallcomment, postcomment, editcomment, likecomment, dislikecomment, translatecomment } from "../controllers/comment.js";

const routes = express.Router();
routes.get("/:videoid", getallcomment);
routes.post("/postcomment", postcomment);
routes.delete("/deletecomment/:id", deletecomment);
routes.post("/editcomment/:id", editcomment);
routes.post("/like/:id", likecomment);
routes.post("/dislike/:id", dislikecomment);
routes.post("/translate", translatecomment);
export default routes;
