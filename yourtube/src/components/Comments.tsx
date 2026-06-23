import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { ThumbsUp, ThumbsDown, Globe, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Comment {
  _id: string;
  videoid: string;
  userid: string;
  commentbody: string;
  usercommented: string;
  commentedon: string;
  likes: string[];
  dislikes: string[];
  cityName: string;
}

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "hi", name: "Hindi" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
  { code: "kn", name: "Kannada" },
  { code: "ml", name: "Malayalam" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
];

const Comments = ({ videoId }: { videoId: any }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  
  // Track translated text for specific comment IDs: { [commentId]: translatedText }
  const [translations, setTranslations] = useState<{ [key: string]: string }>({});
  const [translatingId, setTranslatingId] = useState<string | null>(null);

  useEffect(() => {
    loadComments();
  }, [videoId]);

  const loadComments = async () => {
    try {
      const res = await axiosInstance.get(`/comment/${videoId}`);
      setComments(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (commentId: string) => {
    if (!user) {
      toast.error("Please sign in to like comments");
      return;
    }
    try {
      const res = await axiosInstance.post(`/comment/like/${commentId}`, {
        userId: user._id,
      });
      if (res.data) {
        setComments((prev) =>
          prev.map((c) => (c._id === commentId ? { ...c, likes: res.data.likes, dislikes: res.data.dislikes } : c))
        );
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDislike = async (commentId: string) => {
    if (!user) {
      toast.error("Please sign in to dislike comments");
      return;
    }
    try {
      const res = await axiosInstance.post(`/comment/dislike/${commentId}`, {
        userId: user._id,
      });
      if (res.data.deleted) {
        toast.info("Comment automatically removed due to moderation feedback");
        setComments((prev) => prev.filter((c) => c._id !== commentId));
      } else if (res.data) {
        setComments((prev) =>
          prev.map((c) => (c._id === commentId ? { ...c, likes: res.data.likes, dislikes: res.data.dislikes } : c))
        );
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleTranslate = async (commentId: string, text: string, targetLang: string) => {
    setTranslatingId(commentId);
    try {
      const res = await axiosInstance.post("/comment/translate", {
        text,
        targetLang,
      });
      if (res.data && res.data.translatedText) {
        setTranslations((prev) => ({
          ...prev,
          [commentId]: res.data.translatedText,
        }));
        toast.success(`Translated successfully!`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Translation failed");
    } finally {
      setTranslatingId(null);
    }
  };

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;

    // Client-side special character validation
    const specialCharsRegex = /[@#$%\^&\*+=\[\]\{\}\|\\<>\/]/;
    if (specialCharsRegex.test(newComment)) {
      toast.error("Special characters like @, #, $, %, etc. are blocked in comments.");
      return;
    }

    setIsSubmitting(true);
    let cityName = "Unknown Location";

    try {
      // Fetch city context
      const geoRes = await fetch("https://ipapi.co/json/");
      const geoData = await geoRes.json();
      if (geoData && geoData.city) {
        cityName = geoData.city;
      }
    } catch (geoError) {
      console.log("Could not resolve IP location, fallback to default", geoError);
    }

    try {
      const res = await axiosInstance.post("/comment/postcomment", {
        videoid: videoId,
        userid: user._id,
        commentbody: newComment,
        usercommented: user.name,
        cityName: cityName,
      });
      if (res.data.comment) {
        toast.success("Comment posted successfully");
        loadComments(); // Reload comments list to ensure correct state and server _id
      }
      setNewComment("");
    } catch (error: any) {
      console.error("Error adding comment:", error);
      const errMsg = error.response?.data?.message || "Failed to post comment";
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (comment: Comment) => {
    setEditingCommentId(comment._id);
    setEditText(comment.commentbody);
  };

  const handleUpdateComment = async () => {
    if (!editText.trim()) return;

    const specialCharsRegex = /[@#$%\^&\*+=\[\]\{\}\|\\<>\/]/;
    if (specialCharsRegex.test(editText)) {
      toast.error("Special characters like @, #, $, %, etc. are blocked in comments.");
      return;
    }

    try {
      const res = await axiosInstance.post(
        `/comment/editcomment/${editingCommentId}`,
        { commentbody: editText }
      );
      if (res.data) {
        setComments((prev) =>
          prev.map((c) =>
            c._id === editingCommentId ? { ...c, commentbody: editText } : c
          )
        );
        // Clear translation cache for this comment
        if (translations[editingCommentId!]) {
          const updatedTrans = { ...translations };
          delete updatedTrans[editingCommentId!];
          setTranslations(updatedTrans);
        }
        setEditingCommentId(null);
        setEditText("");
        toast.success("Comment updated successfully");
      }
    } catch (error: any) {
      console.log(error);
      const errMsg = error.response?.data?.message || "Failed to update comment";
      toast.error(errMsg);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await axiosInstance.delete(`/comment/deletecomment/${id}`);
      if (res.data.comment) {
        setComments((prev) => prev.filter((c) => c._id !== id));
        toast.success("Comment deleted");
      }
    } catch (error) {
      console.log(error);
      toast.error("Failed to delete comment");
    }
  };

  if (loading) {
    return <div className="text-sm text-[var(--foreground)] py-4">Loading comments...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{comments.length} Comments</h2>

      {user ? (
        <div className="flex gap-4">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.image || ""} />
            <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Add a public comment (special characters like @, #, $, % are not allowed)..."
              value={newComment}
              onChange={(e: any) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none border-0 border-b-2 rounded-none focus-visible:ring-0 text-sm bg-transparent"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => setNewComment("")}
                disabled={!newComment.trim()}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isSubmitting}
                className="text-xs bg-red-600 hover:bg-red-700 text-white rounded-full px-4"
              >
                {isSubmitting ? "Posting..." : "Comment"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[var(--foreground)]">Sign in to add a comment</p>
      )}

      <div className="space-y-6">
        {comments.length === 0 ? (
          <p className="text-sm text-[var(--foreground)] italic">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => {
            const isLiked = comment.likes?.includes(user?._id || "");
            const isDisliked = comment.dislikes?.includes(user?._id || "");
            const isTranslated = !!translations[comment._id];

            return (
              <div className="flex gap-4 group bg-[var(--comment-bg)] text-[var(--comment-text)] rounded-md p-3">
                <Avatar className="w-10 h-10 border">
                  <AvatarFallback>{comment.usercommented?.[0] || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-sm text-[var(--foreground)]">
                      {comment.usercommented}
                    </span>
                    <span className="text-[10px] bg-[var(--comment-bg)] text-[var(--comment-text)] px-2 py-0.5 rounded-full">
                      📍 {comment.cityName || "Local User"}
                    </span>
                    <span className="text-xs text-[var(--foreground)]">
                      {formatDistanceToNow(new Date(comment.commentedon))} ago
                    </span>
                  </div>

                  {editingCommentId === comment._id ? (
                    <div className="space-y-2 mt-2">
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="text-sm"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          onClick={handleUpdateComment}
                          disabled={!editText.trim()}
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 text-white text-xs rounded-full"
                        >
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setEditingCommentId(null);
                            setEditText("");
                          }}
                          size="sm"
                          className="text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm leading-relaxed text-[var(--foreground)]">
                        {isTranslated ? translations[comment._id] : comment.commentbody}
                      </p>

                      {isTranslated && (
                        <p className="text-[11px] text-red-600 dark:text-red-400 italic flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Translated view (showing selected language)
                          <button
                            onClick={() => {
                              const updatedTrans = { ...translations };
                              delete updatedTrans[comment._id];
                              setTranslations(updatedTrans);
                            }}
                            className="ml-2 underline cursor-pointer text-[var(--foreground)] hover:opacity-70"
                          >
                            Show original
                          </button>
                        </p>
                      )}

                      {/* Comment Actions: Like, Dislike, Translate, Edit/Delete */}
                      <div className="flex items-center gap-4 mt-2 text-xs text-[var(--foreground)]">
                        {/* Likes */}
                        <button
                          onClick={() => handleLike(comment._id)}
                          className={`flex items-center gap-1 hover:text-[var(--foreground)] transition ${
                            isLiked ? "text-blue-600 font-bold" : ""
                          }`}
                        >
                          <ThumbsUp className={`w-4 h-4 ${isLiked ? "fill-blue-600" : ""}`} />
                          <span>{comment.likes?.length || 0}</span>
                        </button>

                        {/* Dislikes */}
                        <button
                          onClick={() => handleDislike(comment._id)}
                          className={`flex items-center gap-1 hover:text-[var(--foreground)] transition ${
                            isDisliked ? "text-red-600 font-bold" : ""
                          }`}
                        >
                          <ThumbsDown className={`w-4 h-4 ${isDisliked ? "fill-red-600" : ""}`} />
                          <span>{comment.dislikes?.length || 0}</span>
                        </button>

                        {/* Translate Selector */}
                        <div className="flex items-center gap-1 relative border rounded px-1 py-0.5 text-[11px]">
                          <Globe className="w-3 h-3" />
                          <select
                            disabled={translatingId === comment._id}
                            onChange={(e) => {
                              if (e.target.value) {
                                handleTranslate(comment._id, comment.commentbody, e.target.value);
                                e.target.value = ""; // Reset selector
                              }
                            }}
                            className="bg-transparent border-0 outline-none cursor-pointer pr-1 text-[11px]"
                            defaultValue=""
                          >
                            <option value="" disabled>Translate</option>
                            {LANGUAGES.map((lang) => (
                              <option key={lang.code} value={lang.code}>
                                {lang.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Edit / Delete (Own comments) */}
                        {comment.userid === user?._id && (
                          <div className="flex gap-2 border-l pl-3 ml-1">
                            <button
                              onClick={() => handleEdit(comment)}
                              className="hover:text-blue-600"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(comment._id)}
                              className="hover:text-red-600"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Comments;
