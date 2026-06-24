import video from "../Modals/video.js";
import users from "../Modals/Auth.js";
import mongoose from "mongoose";

export const uploadvideo = async (req, res) => {
  if (req.file === undefined) {
    return res
      .status(404)
      .json({ message: "plz upload a mp4 video file only" });
  } else {
    try {
      // Store relative path for frontend access
      const relativePath = req.file.path.replace(/\\/g, '/').split('/uploads/')[1] || req.file.filename;
      
      const file = new video({
        videotitle: req.body.videotitle,
        filename: req.file.originalname,
        filepath: `uploads/${relativePath}`,
        filetype: req.file.mimetype,
        filesize: req.file.size,
        videochanel: req.body.videochanel,
        uploader: req.body.uploader,
      });
      await file.save();
      console.log("Video uploaded with filepath:", file.filepath);
      return res.status(201).json("file uploaded successfully");
    } catch (error) {
      console.error(" error:", error);
      return res.status(500).json({ message: "Something went wrong" });
    }
  }
};

export const getallvideo = async (req, res) => {
  try {
    const files = await video.find();
    return res.status(200).send(files);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const downloadvideo = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ message: "Invalid video ID" });
  }

  try {
    const vid = await video.findById(id);
    if (!vid) {
      return res.status(404).json({ message: "Video not found" });
    }

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const user = await users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const todayStr = new Date().toDateString();

    // Check plan limits
    if (!user.plan || user.plan === "Free") {
      // Find downloads from history or compare lastDownloadDate
      const lastDownloadDateStr = user.joinedon ? new Date(user.joinedon).toDateString() : ""; // placeholder
      // We can use a simple custom check: let's look at user's downloadedVideos and a simulated limit
      // Let's implement robust tracking using user.lastDownloadDate (which we can set dynamically)
      // Since lastDownloadDate was not in the schema initially, we can initialize it or use field checks
      // In JS we can access dynamic mongoose fields easily even if not explicitly in schema, or we can check the downloads list.
      // Let's use a dynamic check:
      const userObj = user.toObject();
      const lastDownDate = userObj.lastDownloadDate ? new Date(userObj.lastDownloadDate).toDateString() : "";
      let downloadCount = userObj.downloadCountToday || 0;

      if (lastDownDate === todayStr) {
        if (downloadCount >= 1) {
          return res.status(403).json({
            limitExceeded: true,
            message: "Free plan limit reached: 1 download per day. Upgrade to Bronze, Silver, or Gold for unlimited downloads!",
          });
        }
        downloadCount += 1;
      } else {
        downloadCount = 1;
      }

      // Save user download logs
      await users.findByIdAndUpdate(userId, {
        $set: { lastDownloadDate: new Date(), downloadCountToday: downloadCount },
        $addToSet: { downloadedVideos: id }
      });
    } else {
      // Premium user (Bronze, Silver, Gold): unlimited downloads
      await users.findByIdAndUpdate(userId, {
        $addToSet: { downloadedVideos: id }
      });
    }

    // Return the file path so the frontend can trigger browser download
    return res.status(200).json({ success: true, filepath: vid.filepath, filename: vid.filename || vid.videotitle + '.mp4' });
  } catch (error) {
    console.error("Download error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getdownloadedvideos = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await users.findById(userId).populate({
      path: "downloadedVideos",
      model: "videofiles"
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(user.downloadedVideos || []);
  } catch (error) {
    console.error("Get downloaded videos error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
