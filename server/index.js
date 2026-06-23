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

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.use(bodyParser.json());

// Static files
app.use("/uploads", express.static(path.join("uploads")));

// Test route
app.get("/", (req, res) => {
  res.send("YouTube backend is working");
});

// Routes
app.use("/user", userroutes);
app.use("/video", videoroutes);
app.use("/like", likeroutes);
app.use("/watch", watchlaterroutes);
app.use("/history", historyrroutes);
app.use("/comment", commentroutes);
app.use("/payment", paymentroutes);

// DB connection
mongoose
  .connect(process.env.DB_URL)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// Server
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Socket logic
io.on("connection", (socket) => {
  console.log(`WebRTC user connected: ${socket.id}`);

  socket.on("join-room", (roomId, userId) => {
    socket.join(roomId);
    socket.to(roomId).emit("user-connected", userId, socket.id);

    socket.on("disconnect", () => {
      socket.to(roomId).emit("user-disconnected", userId, socket.id);
    });
  });

  socket.on("offer", (payload) => {
    if (payload.targetSocketId) {
      io.to(payload.targetSocketId).emit("offer", payload);
    } else {
      socket.to(payload.roomId).emit("offer", payload);
    }
  });

  socket.on("answer", (payload) => {
    if (payload.targetSocketId) {
      io.to(payload.targetSocketId).emit("answer", payload);
    } else {
      socket.to(payload.roomId).emit("answer", payload);
    }
  });

  socket.on("ice-candidate", (payload) => {
    if (payload.targetSocketId) {
      io.to(payload.targetSocketId).emit("ice-candidate", payload);
    } else {
      socket.to(payload.roomId).emit("ice-candidate", payload);
    }
  });
});

// IMPORTANT: ONLY ONE PORT (FIXED)
const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});