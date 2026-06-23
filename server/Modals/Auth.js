import mongoose from "mongoose";
const userschema = mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String },
  channelname: { type: String },
  description: { type: String },
  image: { type: String },
  joinedon: { type: Date, default: Date.now },
  plan: { type: String, enum: ["Free", "Bronze", "Silver", "Gold"], default: "Free" },
  lastDownloadDate: { type: Date },
  downloadCountToday: { type: Number, default: 0 },
  mobile: { type: String, default: "" },
  downloadedVideos: [{ type: mongoose.Schema.Types.ObjectId, ref: "videofiles" }],
});

export default mongoose.model("user", userschema);
