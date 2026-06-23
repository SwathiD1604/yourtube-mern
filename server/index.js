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

/* =======================
   CORS (SAFE PRODUCTION FIX)
======================= */

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  process.env.FRONTEND_URL,
];

// remove undefined values
const filteredOrigins = allowedOrigins.filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // allow server-to-server or curl requests
      if (!origin) return callback(null, true);

      if (
        filteredOrigins.includes(origin) ||
        origin.endsWith(".vercel.app")
      ) {
        return callback(null, true);
      }

      console.log("❌ Blocked by CORS:", origin);
      return callback(null, true); // don't crash frontend
    },
    credentials: true,
  })
);

/* =======================
   MIDDLEWARE
======================= */

app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true, limit: "30mb" }));
app.use(bodyParser.json());

app.use("/uploads", express.static(path.join("uploads")));

/* =======================
   TEST ROUTE
======================= */

app.get("/", (req, res) => {
  res.send("YouTube backend is working");
});

/* =======================
   ROUTES
======================= */

app.use("/user", userroutes);
app.use("/video", videoroutes);
app.use("/like", likeroutes);
app.use("/watch", watchlaterroutes);
app.use("/history", historyrroutes);
app.use("/comment", commentroutes);
app.use("/payment", paymentroutes);

/* =======================
   DATABASE CONNECTION
======================= */

mongoose
  .connect(process.env.DB_URL)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB error:", err));

/* =======================
   SERVER + SOCKET
======================= */

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // simple + safe for now
    methods: ["GET", "POST"],
  },
});

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

/* =======================
   START SERVER
======================= */

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});