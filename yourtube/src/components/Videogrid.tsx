import React, { useEffect, useState } from "react";
import Videocard from "./videocard";
import axiosInstance from "@/lib/axiosinstance";

const Videogrid = () => {
  // FIX 1: never keep null for arrays
  const [videos, setvideo] = useState<any[]>([]);
  const [loading, setloading] = useState(true);

  useEffect(() => {
    const fetchvideo = async () => {
      try {
        const res = await axiosInstance.get("/video/getall");

        // FIX 2: ensure array always
        setvideo(res.data || []);
      } catch (error) {
        console.log("Video fetch error:", error);
        setvideo([]); // FIX 3: prevent crash on error
      } finally {
        setloading(false);
      }
    };

    fetchvideo();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {loading ? (
        <div>Loading...</div>
      ) : videos.length > 0 ? (
        videos.map((video: any) => (
          <Videocard key={video._id} video={video} />
        ))
      ) : (
        <div>No videos found</div>
      )}
    </div>
  );
};

export default Videogrid;