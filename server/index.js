import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import http from "http";
import { Server } from "socket.io";
import path from "path";

import userroutes from "./routes/auth.js";
import videoroutes from "./routes/video.js";
import likeroutes from "./routes/like.js";
import watchlaterroutes from "./routes/watchlater.js";
import historyrroutes from "./routes/history.js";
import commentroutes from "./routes/comment.js";
import paymentroutes from "./routes/payment.js";
import adminroutes from "./routes/admin.js";

dotenv.config();

const app = express();

/* =========================
   CORS (SAFE FIX)
========================= */

app.use(
  cors({
    origin: "*", // TEMP FIX (important for debugging)
    credentials: true,
  })
);

/* =========================
   MIDDLEWARE
========================= */

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(bodyParser.json());

app.use("/uploads", express.static(path.join("uploads")));

/* =========================
   TEST ROUTE
========================= */

app.get("/", (req, res) => {
  res.send("YouTube backend is working 🚀");
});

/* =========================
   ROUTES
========================= */

app.use("/user", userroutes);
app.use("/video", videoroutes);
app.use("/like", likeroutes);
app.use("/watch", watchlaterroutes);
app.use("/history", historyrroutes);
app.use("/comment", commentroutes);
app.use("/payment", paymentroutes);
app.use("/admin", adminroutes);

/* =========================
   DB CONNECTION (IMPORTANT FIX)
========================= */

mongoose
  .connect(process.env.DB_URL)
  .then(() => console.log("MongoDB connected ✅"))
  .catch((err) => {
    console.log("MongoDB ERROR ❌", err.message);
  });

/* =========================
   SERVER
========================= */

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

/* =========================
   SOCKET
========================= */

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", (roomId, userId) => {
    socket.join(roomId);
    socket.to(roomId).emit("user-connected", userId, socket.id);

    socket.on("disconnect", () => {
      socket.to(roomId).emit("user-disconnected", userId, socket.id);
    });
  });

  socket.on("offer", (payload) => {
    io.to(payload.targetSocketId || payload.roomId).emit("offer", payload);
  });

  socket.on("answer", (payload) => {
    io.to(payload.targetSocketId || payload.roomId).emit("answer", payload);
  });

  socket.on("ice-candidate", (payload) => {
    io.to(payload.targetSocketId || payload.roomId).emit("ice-candidate", payload);
  });
});

/* =========================
   PORT
========================= */

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT} 🚀`);
});