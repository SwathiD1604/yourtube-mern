import video from "../Modals/video.js";

// Fix all video filepaths from absolute to relative
export const fixVideoPaths = async (req, res) => {
  try {
    const videos = await video.find();
    console.log(`Found ${videos.length} videos`);

    let updatedCount = 0;

    for (const vid of videos) {
      const oldPath = vid.filepath;
      
      // Check if path needs fixing (contains absolute path)
      if (oldPath && (oldPath.includes('/uploads/') || oldPath.includes('\\uploads\\'))) {
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

    console.log(`Fixed ${updatedCount} video paths`);
    return res.status(200).json({ 
      success: true, 
      message: `Fixed ${updatedCount} video paths`,
      updatedCount 
    });
  } catch (error) {
    console.error("Error fixing video paths:", error);
    return res.status(500).json({ message: "Error fixing video paths", error: error.message });
  }
};
