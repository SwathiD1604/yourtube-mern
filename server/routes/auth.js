import express from "express";
import { login, updateprofile, sendotp, verifyotp } from "../controllers/auth.js";
const routes = express.Router();

routes.post("/login", login);
routes.patch("/update/:id", updateprofile);
routes.post("/send-otp", sendotp);
routes.post("/verify-otp", verifyotp);
export default routes;
