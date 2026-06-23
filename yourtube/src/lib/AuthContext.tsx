import React, {
  useState,
  createContext,
  useEffect,
  useContext,
} from "react";
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

const UserContext = createContext<UserContextType>(
  {} as UserContextType
);

// ---------------- Theme Logic ----------------
const computeTheme = (region: string): boolean => {
  const southIndianStates = [
    "tamil nadu",
    "kerala",
    "karnataka",
    "andhra pradesh",
    "telangana",
  ];

  const isSouthIndia = southIndianStates.includes(
    region.toLowerCase()
  );

  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const istDate = new Date(utc + 3600000 * 5.5);

  const hours = istDate.getHours();
  const minutes = istDate.getMinutes();
  const minsSinceMidnight = hours * 60 + minutes;

  const isLightTime =
    minsSinceMidnight >= 600 && minsSinceMidnight <= 720;

  return isSouthIndia && isLightTime;
};

const applyTheme = (shouldBeLight: boolean) => {
  if (shouldBeLight) {
    document.documentElement.classList.remove("dark");
  } else {
    document.documentElement.classList.add("dark");
  }
};

// ---------------- Provider ----------------
export const UserProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [user, setUser] = useState<any>(null);

  const [regionState, setRegionState] = useState<string>(
    typeof window !== "undefined"
      ? localStorage.getItem("region") || ""
      : ""
  );

  const [timeMode, setTimeMode] = useState<string>(
    typeof window !== "undefined"
      ? localStorage.getItem("timeMode") || "system"
      : "system"
  );

  const [isLightTheme, setIsLightTheme] =
    useState<boolean>(false);

  // ---------------- Auth ----------------
  const login = (userdata: any) => {
    setUser(userdata);
    localStorage.setItem("user", JSON.stringify(userdata));
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem("user");
    toast.success("Signed out successfully");
  };

  // ---------------- Restore user ----------------
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

  // ---------------- Detect location ----------------
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

  // ---------------- Theme updater ----------------
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

// ---------------- Hook ----------------
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
};