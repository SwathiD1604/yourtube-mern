import React, { useState, createContext, useEffect, useContext } from "react";
import axiosInstance from "./axiosinstance";
import { toast } from "sonner";

interface UserContextType {
  user: any;
  login: (userdata: any) => void;
  logout: () => Promise<void>;
  regionState: string;
  setRegionState: React.Dispatch<React.SetStateAction<string>>;
  timeMode: string;
  setTimeMode: React.Dispatch<React.SetStateAction<string>>;
  isLightTheme: boolean;
}

const UserContext = createContext<UserContextType | null>(null);

// Pure function: compute theme from region + current IST time
const computeTheme = (region: string): boolean => {
  const southIndianStates = ["tamil nadu", "kerala", "karnataka", "andhra pradesh", "telangana"];
  const isSouthIndia = southIndianStates.includes(region.toLowerCase());

  // Calculate current IST time (UTC + 5:30)
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const istDate = new Date(utc + 3600000 * 5.5);
  const hours = istDate.getHours();
  const minutes = istDate.getMinutes();
  const minsSinceMidnight = hours * 60 + minutes;

  // Light only: South India AND between 10:00 AM (600 mins) – 12:00 PM (720 mins) IST
  const isLightTime = minsSinceMidnight >= 600 && minsSinceMidnight <= 720;
  return isSouthIndia && isLightTime;
};

// Apply theme to <html> immediately
const applyTheme = (shouldBeLight: boolean) => {
  if (shouldBeLight) {
    document.documentElement.classList.remove("dark");
  } else {
    document.documentElement.classList.add("dark");
  }
};

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [regionState, _setRegionState] = useState<string>(
    typeof window !== "undefined" ? localStorage.getItem("region") || "" : ""
  );
  // wrapper to persist selected region
  const setRegionState = (val: string) => {
    _setRegionState(val);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("region", val || "");
      }
    } catch (e) {
      /* ignore storage errors */
    }
  };
  const [isLightTheme, setIsLightTheme] = useState<boolean>(false);
  const [timeMode, _setTimeMode] = useState<string>(
    typeof window !== "undefined" ? localStorage.getItem("timeMode") || "system" : "system"
  );
  const setTimeMode = (val: string) => {
    _setTimeMode(val);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("timeMode", val || "system");
      }
    } catch (e) {
      /* ignore */
    }
  };

  const login = (userdata: any) => {
    setUser(userdata);
    localStorage.setItem("user", JSON.stringify(userdata));
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem("user");
    toast.success("Signed out successfully");
  };

  // Restore user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Auto-detect user state/location via IP on mount
  useEffect(() => {
    const detectLocation = async () => {
      try {
        // If region already set in localStorage or by user, keep it
        if (regionState && regionState.trim().length > 0) return;
        const geoRes = await fetch("https://ipapi.co/json/");
        const geoData = await geoRes.json();
        if (geoData && geoData.region) {
          setRegionState(geoData.region);
        }
      } catch (error) {
        console.log("Location auto-detection failed. Defaulting to dark theme.");
        setRegionState("");
      }
    };
    detectLocation();
  }, []);

  // Theme application: re-evaluate every 30 seconds + on region change
  useEffect(() => {
    const updateTheme = () => {
      // Respect forced timeMode
      let light = computeTheme(regionState);
      if (timeMode === "force-light") light = true;
      else if (timeMode === "force-dark") light = false;
      setIsLightTheme(light);
      applyTheme(light);
    };

    updateTheme(); // Apply immediately
    const interval = setInterval(updateTheme, 30000); // Re-check every 30s
    return () => clearInterval(interval);
  }, [regionState, timeMode]);

  return (
    <UserContext.Provider
      value={{
        user,
        login,
        logout,
        regionState,
        setRegionState,
        timeMode,
        setTimeMode,
        isLightTheme,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
