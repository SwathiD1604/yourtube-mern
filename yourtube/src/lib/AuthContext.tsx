import React, { useState, createContext, useEffect, useContext } from "react";
import axiosInstance from "./axiosinstance";
import { toast } from "sonner";

interface UserContextType {
  user: any;
  login: (userdata: any) => void;
  logout: () => Promise<void>;
  regionState: string;
  setRegionState: (value: string | ((prev: string) => string)) => void;
  timeMode: string;
  setTimeMode: (value: string | ((prev: string) => string)) => void;
  isLightTheme: boolean;
}

const UserContext = createContext<UserContextType | null>(null);

// Theme logic
const computeTheme = (region: string): boolean => {
  const southIndianStates = [
    "tamil nadu",
    "kerala",
    "karnataka",
    "andhra pradesh",
    "telangana",
  ];

  const isSouthIndia = southIndianStates.includes(region.toLowerCase());

  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const istDate = new Date(utc + 3600000 * 5.5);
  const hours = istDate.getHours();
  const minutes = istDate.getMinutes();
  const minsSinceMidnight = hours * 60 + minutes;

  const isLightTime = minsSinceMidnight >= 600 && minsSinceMidnight <= 720;

  return isSouthIndia && isLightTime;
};

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
    typeof window !== "undefined"
      ? localStorage.getItem("region") || ""
      : ""
  );

  const setRegionState = (
    value: string | ((prev: string) => string)
  ) => {
    _setRegionState((prev) => {
      const next =
        typeof value === "function" ? value(prev) : value;

      if (typeof window !== "undefined") {
        localStorage.setItem("region", next || "");
      }

      return next;
    });
  };

  const [timeMode, _setTimeMode] = useState<string>(
    typeof window !== "undefined"
      ? localStorage.getItem("timeMode") || "system"
      : "system"
  );

  const setTimeMode = (
    value: string | ((prev: string) => string)
  ) => {
    _setTimeMode((prev) => {
      const next =
        typeof value === "function" ? value(prev) : value;

      if (typeof window !== "undefined") {
        localStorage.setItem("timeMode", next || "system");
      }

      return next;
    });
  };

  const [isLightTheme, setIsLightTheme] = useState<boolean>(false);

  const login = (userdata: any) => {
    setUser(userdata);
    localStorage.setItem("user", JSON.stringify(userdata));
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem("user");
    toast.success("Signed out successfully");
  };

  // restore user
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

  // detect location
  useEffect(() => {
    const detectLocation = async () => {
      try {
        if (regionState) return;

        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();

        if (data?.region) {
          setRegionState(data.region);
        }
      } catch (err) {
        setRegionState("");
      }
    };

    detectLocation();
  }, []);

  // theme updater
  useEffect(() => {
    const updateTheme = () => {
      let light = computeTheme(regionState);

      if (timeMode === "force-light") light = true;
      if (timeMode === "force-dark") light = false;

      setIsLightTheme(light);
      applyTheme(light);
    };

    updateTheme();

    const interval = setInterval(updateTheme, 30000);

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
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
};