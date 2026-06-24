import mongoose from "mongoose";
import dotenv from "dotenv";
import video from "../Modals/video.js";

dotenv.config();

const fixVideoPaths = async () => {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("Connected to MongoDB");

    const videos = await video.find();
    console.log(`Found ${videos.length} videos`);

    let updatedCount = 0;

    for (const vid of videos) {
      const oldPath = vid.filepath;
      
      // Check if path needs fixing (contains absolute path)
      if (oldPath.includes('/uploads/') || oldPath.includes('\\uploads\\')) {
        // Extract just the filename part
        const parts = oldPath.split(/\/uploads\/|\\uploads\\/);
        if (parts.length > 1) {
          const newPath = `uploads/${parts[1]}`;
          
          await video.findByIdAndUpdate(vid._id, { filepath: newPath });
          console.log(`Updated: ${oldPath} -> ${newPath}`);
          updatedCount++;
        }
      }
    }

    console.log(`\n✅ Fixed ${updatedCount} video paths`);
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

fixVideoPaths();
