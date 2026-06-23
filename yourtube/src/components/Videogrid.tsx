import React, { useEffect, useState } from "react";
import Videocard from "./videocard";
import axiosInstance from "@/lib/axiosinstance";

const Videogrid = () => {
  const [videos, setVideos] = useState<any[]>([]); // ✅ FIXED
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchvideo = async () => {
      try {
        const res = await axiosInstance.get("/video/getall");

        // ✅ SAFE fallback
        setVideos(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        console.log("Video fetch error:", error);
        setVideos([]); // ✅ prevent crash
      } finally {
        setLoading(false);
      }
    };

    fetchvideo();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {loading ? (
        <div>Loading...</div>
      ) : videos.length === 0 ? (
        <div>No videos found</div>
      ) : (
        videos.map((video: any) => (
          <Videocard key={video._id} video={video} />
        ))
      )}
    </div>
  );
};

export default Videogrid;