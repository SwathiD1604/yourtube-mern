"use client";

import { useRef, useEffect, useState } from "react";
import { useUser } from "@/lib/AuthContext";
import { useRouter } from "next/router";
import { Button } from "./ui/button";
import { Play, Pause, RotateCcw, Volume2, Maximize, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "@/lib/axiosinstance";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
  };
}

export default function VideoPlayer({ video }: VideoPlayerProps) {
  const { user } = useUser();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [watchTime, setWatchTime] = useState(0); // in seconds
  const [limitExceeded, setLimitExceeded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  // Click gesture trackers
  const clickTrackerRef = useRef<{ count: number; lastTime: number }>({ count: 0, lastTime: 0 });
  const timerRef = useRef<any>(null);

  // Determine watch limit based on user plan
  const getWatchLimit = () => {
    const plan = user?.plan || "Free";
    if (plan === "Bronze") return 7 * 60; // 7 minutes
    if (plan === "Silver") return 10 * 60; // 10 minutes
    if (plan === "Gold") return Infinity; // Unlimited
    return 5 * 60; // Free = 5 minutes
  };

  const limitSeconds = getWatchLimit();

  // Monitor watch time limits
  useEffect(() => {
    let interval: any;
    if (isPlaying && !limitExceeded) {
      interval = setInterval(() => {
        setWatchTime((prev) => {
          const nextTime = prev + 1;
          if (nextTime >= limitSeconds) {
            setLimitExceeded(true);
            setIsPlaying(false);
            if (videoRef.current) {
              videoRef.current.pause();
            }
            toast.error("Video watching limit reached for your current plan!");
            clearInterval(interval);
          }
          return nextTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, limitSeconds, limitExceeded]);

  // Reset states when video changes
  useEffect(() => {
    setWatchTime(0);
    setLimitExceeded(false);
    setIsPlaying(false);
    setProgress(0);
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [video]);

  const togglePlay = () => {
    if (limitExceeded) {
      toast.error("Upgrade your plan to continue watching.");
      return;
    }

    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch((err) => {
          console.error("Playback block:", err);
        });
      }
    }
  };

  const seek = (amount: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + amount));
    }
  };

  const handleSkipToNext = async () => {
    try {
      const res = await axiosInstance.get("/video/getall");
      const list = res.data || [];
      const currentIndex = list.findIndex((v: any) => v._id === video._id);
      if (currentIndex !== -1 && list[currentIndex + 1]) {
        toast.info("Skipping to next video...");
        router.push(`/watch/${list[currentIndex + 1]._id}`);
      } else if (list.length > 0) {
        toast.info("Looping back to first video...");
        router.push(`/watch/${list[0]._id}`);
      } else {
        toast.info("No other videos to skip to");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenComments = () => {
    toast.info("Opening comments section...");
    const commentsEl = document.getElementById("comments-section");
    if (commentsEl) {
      commentsEl.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }
  };

  const handleCloseWebsite = () => {
    toast.warning("Closing page...");
    // Attempt standard tab close
    window.close();
    // Redirect fallback (since browsers restrict window.close)
    setTimeout(() => {
      window.location.href = "https://www.google.com";
    }, 1000);
  };

  // Main click/tap handler for gestures
  const handleGestureClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (limitExceeded) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;

    // Determine region: Left (0-35%), Center (35-65%), Right (65-100%)
    let region: "left" | "center" | "right" = "center";
    if (clickX < width * 0.35) {
      region = "left";
    } else if (clickX > width * 0.65) {
      region = "right";
    }

    const now = Date.now();
    const tracker = clickTrackerRef.current;

    if (now - tracker.lastTime < 350) {
      tracker.count += 1;
    } else {
      tracker.count = 1;
    }
    tracker.lastTime = now;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      const taps = tracker.count;
      tracker.count = 0; // Reset

      if (taps === 1) {
        // Single tap in center: play/pause
        if (region === "center") {
          togglePlay();
        }
      } else if (taps === 2) {
        // Double tap left: seek back 10s
        if (region === "left") {
          seek(-10);
          toast.info("⏪ Seek back 10s");
        }
        // Double tap right: seek forward 10s
        else if (region === "right") {
          seek(10);
          toast.info("⏩ Seek forward 10s");
        }
      } else if (taps === 3) {
        // Triple tap center: skip video
        if (region === "center") {
          handleSkipToNext();
        }
        // Triple tap left: open comments
        else if (region === "left") {
          handleOpenComments();
        }
        // Triple tap right: close website
        else if (region === "right") {
          handleCloseWebsite();
        }
      }
    }, 300);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const dur = videoRef.current.duration || 0;
      setDuration(dur);
      setProgress(dur > 0 ? (current / dur) * 100 : 0);
    }
  };

  const handleProgressBarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const newTime = (parseFloat(e.target.value) / 100) * duration;
      videoRef.current.currentTime = newTime;
      setProgress(parseFloat(e.target.value));
    }
  };

  return (
    <div className="relative aspect-video bg-black rounded-xl overflow-hidden group shadow-lg">
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onClick={(e) => e.preventDefault()} // Block standard click
      >
        <source
          src={`${process.env.NEXT_PUBLIC_BACKEND_URL || "https://yourtube-backend-sc57.onrender.com"}/${video?.filepath}`}
          type="video/mp4"
        />
        Your browser does not support the video tag.
      </video>

      {/* Transparent Gesture Overlay */}
      <div
        onClick={handleGestureClick}
        className="absolute inset-0 cursor-pointer z-10 select-none"
      />

      {/* Watch Limit Exceeded Overlay */}
      {limitExceeded && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 z-25">
          <AlertCircle className="w-16 h-16 text-red-650 mb-4 animate-bounce" />
          <h2 className="text-xl font-black mb-2 text-white">Watch Limit Reached</h2>
          <p className="text-sm text-zinc-400 max-w-sm mb-6">
            You have watched the maximum allowed {limitSeconds / 60} minutes under the {user?.plan || "Free"} plan.
          </p>
          <Button
            onClick={() => router.push("/upgrade")}
            className="bg-red-600 hover:bg-red-700 text-white rounded-full font-bold px-6 py-2"
          >
            Upgrade Plan to Continue
          </Button>
        </div>
      )}

      {/* Custom Player Controls Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 flex flex-col gap-2">
        {/* Progress Bar */}
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={handleProgressBarChange}
          className="w-full h-1.5 bg-zinc-650 rounded-lg appearance-none cursor-pointer accent-red-600"
        />

        <div className="flex items-center justify-between text-white text-xs">
          <div className="flex items-center gap-3">
            <button onClick={togglePlay} className="hover:text-red-500 transition">
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button onClick={() => seek(-10)} className="hover:text-red-500 transition">
              <RotateCcw className="w-4 h-4" />
            </button>
            <span className="font-medium text-[10px]">
              {videoRef.current ? Math.floor(videoRef.current.currentTime) : 0}s / {Math.floor(duration)}s
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Volume2 className="w-4 h-4" />
            <button
              onClick={() => {
                if (videoRef.current) {
                  if (document.fullscreenElement) {
                    document.exitFullscreen();
                  } else {
                    videoRef.current.requestFullscreen();
                  }
                }
              }}
              className="hover:text-red-500 transition"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Small Gestures Cheat Sheet */}
        <div className="text-[9px] text-zinc-400 mt-1 flex justify-between border-t border-zinc-800 pt-1.5 select-none">
          <span>Double-tap: ⏪ -10s | ⏩ +10s</span>
          <span>Triple-tap: Left (Comments) | Center (Skip) | Right (Exit)</span>
        </div>
      </div>
    </div>
  );
}
