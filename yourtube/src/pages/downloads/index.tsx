import React, { useEffect, useState } from "react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import VideoCard from "@/components/videocard";
import { toast } from "sonner";
import { Download } from "lucide-react";

export default function Downloads() {
  const { user } = useUser();
  const [downloadedVideos, setDownloadedVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user._id) {
      fetchDownloadedVideos();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchDownloadedVideos = async () => {
    try {
      const res = await axiosInstance.get(`/video/downloaded/${user._id}`);
      setDownloadedVideos(res.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load downloaded videos");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 min-h-screen">
        <Download className="w-12 h-12 text-zinc-400 mb-4" />
        <h2 className="text-xl font-bold mb-2">My Downloads</h2>
        <p className="text-sm text-zinc-500 mb-4">Please sign in to view your downloaded videos.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 p-6 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 min-h-screen">
        <h1 className="text-2xl font-bold mb-6">Downloads</h1>
        <p className="text-sm text-zinc-500">Loading downloaded videos...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6 border-b pb-4">
          <div className="p-2 bg-red-150 dark:bg-red-900/30 text-red-600 rounded-lg">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Offline Downloads</h1>
            <p className="text-xs text-zinc-500">Videos saved to your profile for offline playback</p>
          </div>
        </div>

        {downloadedVideos.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-zinc-850 rounded-2xl border shadow-sm space-y-2">
            <p className="text-zinc-500 font-medium">Your downloads list is empty.</p>
            <p className="text-xs text-zinc-400">Find videos you like and download them to access them here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {downloadedVideos.map((video: any) => (
              <VideoCard key={video._id} video={video} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
