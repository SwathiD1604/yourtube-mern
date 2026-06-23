import comment from "../Modals/comment.js";
import mongoose from "mongoose";
import https from "https";

export const postcomment = async (req, res) => {
  const { userid, videoid, commentbody, usercommented, cityName } = req.body;

  // Block comments containing special characters to prevent spam/abuse
  const specialCharsRegex = /[@#$%\^&\*+=\[\]\{\}\|\\<>\/]/;
  if (specialCharsRegex.test(commentbody)) {
    return res.status(400).json({ message: "Comments containing special characters are blocked for safety." });
  }

  const postcomment = new comment({
    userid,
    videoid,
    commentbody,
    usercommented,
    cityName: cityName || "Unknown Location"
  });

  try {
    await postcomment.save();
    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getallcomment = async (req, res) => {
  const { videoid } = req.params;
  try {
    const commentvideo = await comment.find({ videoid: videoid });
    return res.status(200).json(commentvideo);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const deletecomment = async (req, res) => {
  const { id: _id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    await comment.findByIdAndDelete(_id);
    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { commentbody } = req.body;

  const specialCharsRegex = /[@#$%\^&\*+=\[\]\{\}\|\\<>\/]/;
  if (specialCharsRegex.test(commentbody)) {
    return res.status(400).json({ message: "Comments containing special characters are blocked for safety." });
  }

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    const updatecomment = await comment.findByIdAndUpdate(_id, {
      $set: { commentbody: commentbody },
    });
    res.status(200).json(updatecomment);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const likecomment = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    const comm = await comment.findById(id);
    if (!comm) return res.status(404).send("comment not found");

    const likeIndex = comm.likes.indexOf(userId);
    const dislikeIndex = comm.dislikes.indexOf(userId);

    if (likeIndex === -1) {
      comm.likes.push(userId);
      if (dislikeIndex !== -1) {
        comm.dislikes.splice(dislikeIndex, 1);
      }
    } else {
      comm.likes.splice(likeIndex, 1);
    }

    await comm.save();
    return res.status(200).json(comm);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const dislikecomment = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    const comm = await comment.findById(id);
    if (!comm) return res.status(404).send("comment not found");

    const likeIndex = comm.likes.indexOf(userId);
    const dislikeIndex = comm.dislikes.indexOf(userId);

    if (dislikeIndex === -1) {
      comm.dislikes.push(userId);
      if (likeIndex !== -1) {
        comm.likes.splice(likeIndex, 1);
      }
    } else {
      comm.dislikes.splice(dislikeIndex, 1);
    }

    // Auto-remove comment if it receives 2 or more dislikes
    if (comm.dislikes.length >= 2) {
      await comment.findByIdAndDelete(id);
      return res.status(200).json({ deleted: true });
    }

    await comm.save();
    return res.status(200).json(comm);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const translatecomment = async (req, res) => {
  const { text, targetLang, sourceLang } = req.body;
  // Default source language to English if not provided; target defaults to English
  const srcLang = sourceLang?.trim() || "en"; // Ensure a valid ISO code
  const tgtLang = targetLang?.trim() || "en";
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${srcLang}|${tgtLang}`;
    https.get(url, (apiRes) => {
      let data = "";
      apiRes.on("data", (chunk) => {
        data += chunk;
      });
      apiRes.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed && parsed.responseData && parsed.responseData.translatedText) {
            return res.status(200).json({ translatedText: parsed.responseData.translatedText });
          } else {
            // Fallback to original text if parsing fails or missing field
            return res.status(200).json({ translatedText: text });
          }
        } catch (e) {
          // Parsing error – return original text
          return res.status(200).json({ translatedText: text });
        }
      });
    }).on("error", (err) => {
      // Network error – return original text
      return res.status(200).json({ translatedText: text });
    });
  } catch (error) {
    console.error(error);
    return res.status(200).json({ translatedText: text });
  }
};
