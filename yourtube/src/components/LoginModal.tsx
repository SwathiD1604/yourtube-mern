import React, { useState } from "react";
import { useUser } from "@/lib/AuthContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import { X, Mail, Phone, MapPin, User, KeyRound } from "lucide-react";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INDIAN_STATES = [
  // South India
  "Tamil Nadu",
  "Kerala",
  "Karnataka",
  "Andhra Pradesh",
  "Telangana",
  // Other regions
  "Delhi",
  "Maharashtra",
  "Gujarat",
  "Rajasthan",
  "Uttar Pradesh",
  "West Bengal",
  "Punjab",
];

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { login, regionState, setRegionState } = useUser();
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1); // 1 = Info/Send OTP, 2 = Verify OTP
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  
  // Stored target where the OTP was sent
  const [otpTarget, setOtpTarget] = useState("");
  const [otpMethod, setOtpMethod] = useState("");

  if (!isOpen) return null;

  const southIndianStates = ["tamil nadu", "kerala", "karnataka", "andhra pradesh", "telangana"];
  const isSouthIndia = southIndianStates.includes(regionState.toLowerCase());

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSouthIndia && !email.trim()) {
      toast.error("Email address is required for South India regional verification.");
      return;
    }
    if (!isSouthIndia && !mobile.trim()) {
      toast.error("Mobile number is required for regional verification.");
      return;
    }

    setSending(true);
    try {
      console.log("Sending OTP request to:", axiosInstance.defaults.baseURL + "/user/send-otp");
      console.log("Request payload:", { email: email.trim(), mobile: mobile.trim(), location: regionState });
      
      const res = await axiosInstance.post("/user/send-otp", {
        email: email.trim(),
        mobile: mobile.trim(),
        location: regionState,
      });

      console.log("Response received:", res.data);

      if (res.data.success) {
        setOtpTarget(res.data.target);
        setOtpMethod(res.data.method);
        setStep(2);
        toast.success(`Verification OTP sent to your registered ${res.data.method}!`);
        
        // Developer convenience check: if OTP is returned in response, display it
        if (res.data.otp) {
          console.log(`[TESTING OTP] ${res.data.otp}`);
          toast.info(`[DEMO CODE] Your OTP is: ${res.data.otp} (printed to console too)`);
        }
      }
    } catch (error: any) {
      console.error("OTP send error:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error message:", error.message);
      const errMsg = error.response?.data?.message || "Failed to send verification code.";
      toast.error(errMsg);
    } finally {
      setSending(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      toast.error("Please enter the verification OTP.");
      return;
    }

    setVerifying(true);
    try {
      const res = await axiosInstance.post("/user/verify-otp", {
        email: email.trim(),
        mobile: mobile.trim(),
        otp: otp.trim(),
        location: regionState,
        name: name.trim() || undefined,
      });

      if (res.data.result) {
        toast.success(`Verification successful. Welcome, ${res.data.result.name}!`);
        login(res.data.result);
        onClose();
        // Reset modal state
        setStep(1);
        setEmail("");
        setMobile("");
        setName("");
        setOtp("");
      }
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.message || "OTP verification failed. Please try again.";
      toast.error(errMsg);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-850 rounded-2xl border shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-150 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Secure Regional Sign In</h2>
            <p className="text-xs text-zinc-500">Authentication configured based on your state</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 transition"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              {/* Region Selection */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-650 dark:text-zinc-350 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-red-650" /> Select Region / State
                </label>
                <select
                  aria-label="Select region"
                  value={regionState}
                  onChange={(e) => setRegionState(e.target.value)}
                  className="w-full text-sm bg-zinc-50 dark:bg-zinc-800 border rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-red-500"
                >
                  <option value="">Auto-detect (IP)</option>
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st} {southIndianStates.includes(st.toLowerCase()) ? "(South India - Email OTP)" : "(Rest of India - Mobile OTP)"}
                    </option>
                  ))}
                </select>
                  <input type="hidden" name="region" value={regionState} />
              </div>

              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-650 dark:text-zinc-350 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-zinc-400" /> Full Name
                </label>
                <Input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-lg"
                />
              </div>

              {/* Email (South India) / Mobile (Rest of India) */}
              {isSouthIndia ? (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-650 dark:text-zinc-350 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-zinc-400" /> Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="rounded-lg"
                  />
                  <p className="text-[10px] text-zinc-500 italic">
                    Location is South India: verification code will be sent to your email.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-650 dark:text-zinc-350 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-zinc-400" /> Mobile Number
                  </label>
                  <Input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    required
                    className="rounded-lg"
                  />
                  <p className="text-[10px] text-zinc-500 italic">
                    Location is outside southern states: code will be sent to your mobile.
                  </p>
                </div>
              )}

              <Button
                type="submit"
                aria-label="Send verification code"
                disabled={sending}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-xl mt-4 text-sm"
              >
                {sending ? "Sending Code..." : "Send Verification OTP"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center space-y-1 mb-4">
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-150">
                  Verification OTP Sent!
                </p>
                <p className="text-xs text-zinc-500">
                  Enter the 6-digit code sent to <span className="font-bold text-zinc-800 dark:text-zinc-200">{otpTarget}</span> via {otpMethod}.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-650 dark:text-zinc-350 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-zinc-400" /> 6-Digit OTP
                </label>
                <Input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  className="text-center font-bold tracking-widest text-lg rounded-lg"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep(1)}
                  className="flex-1 text-xs rounded-xl"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={verifying}
                  className="flex-1 bg-red-650 hover:bg-red-750 text-white font-bold py-2 rounded-xl text-xs"
                >
                  {verifying ? "Verifying..." : "Verify & Sign In"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
