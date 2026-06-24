import React, { useEffect, useRef, useState } from "react";
import { useUser } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import io from "socket.io-client";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  PhoneOff,
  Circle,
  Phone,
  HelpCircle,
  Activity,
} from "lucide-react";

export default function Calls() {
  const { user } = useUser();
  const [roomId, setRoomId] = useState("");
  const [inCall, setInCall] = useState(false);
  const [isSimulated, setIsSimulated] = useState(false);
  
  // Stream states
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // Device states
  const [cameraActive, setCameraActive] = useState(true);
  const [micActive, setMicActive] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Video element refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);

  // WebRTC refs
  const socketRef = useRef<any>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  // Establish socket connection for WebRTC signaling
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "https://yourtube-backend-sc57.onrender.com";
    socketRef.current = io(socketUrl);

    socketRef.current.on("connect", () => {
      console.log("Connected to signaling server");
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      stopAllStreams();
    };
  }, []);

  const stopAllStreams = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
      setRemoteStream(null);
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setIsScreenSharing(false);
    setInCall(false);
    setIsSimulated(false);
  };

  const startCallMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (error) {
      console.error(error);
      toast.error("Could not access camera/microphone");
      return null;
    }
  };

  // Launch simulated loopback call for single tab testing
  const handleStartSimulation = async () => {
    setIsSimulated(true);
    setInCall(true);
    toast.success("VoIP Simulation Mode started.");

    const stream = await startCallMedia();
    if (stream) {
      // Simulate remote user using the same video stream
      setRemoteStream(stream);
      setTimeout(() => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
      }, 500);
    }
  };

  // WebRTC real call
  const handleJoinCall = async () => {
    if (!roomId.trim()) {
      toast.error("Please enter a call Room ID");
      return;
    }

    setInCall(true);
    setIsSimulated(false);
    toast.success(`Joining room ${roomId}...`);

    const stream = await startCallMedia();
    if (!stream) {
      setInCall(false);
      return;
    }

    const socket = socketRef.current;
    socket.emit("join-room", roomId, user?._id || "anonymous_" + Math.random().toString(36).substring(7));

    // WebRTC connection
    const configuration = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
    const pc = new RTCPeerConnection(configuration);
    peerConnectionRef.current = pc;

    // Add local tracks
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Handle remote track
    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          roomId,
          candidate: event.candidate,
        });
      }
    };

    socket.on("user-connected", async (userId: string, socketId: string) => {
      toast.info("Friend connected. Initiating connection...");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("offer", {
        roomId,
        sdp: pc.localDescription,
        targetSocketId: socketId,
      });
    });

    socket.on("offer", async (payload: any) => {
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", {
        roomId,
        sdp: pc.localDescription,
        targetSocketId: payload.senderId,
      });
    });

    socket.on("answer", async (payload: any) => {
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    });

    socket.on("ice-candidate", async (payload: any) => {
      if (payload.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      }
    });

    socket.on("user-disconnected", () => {
      toast.info("Friend disconnected");
      setRemoteStream(null);
    });
  };

  const handleToggleCamera = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !cameraActive;
        setCameraActive(!cameraActive);
        toast.info(cameraActive ? "Camera turned off" : "Camera turned on");
      }
    }
  };

  const handleToggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !micActive;
        setMicActive(!micActive);
        toast.info(micActive ? "Microphone muted" : "Microphone unmuted");
      }
    }
  };

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStream) {
        screenStream.getTracks().forEach((track) => track.stop());
        setScreenStream(null);
      }
      setIsScreenSharing(false);
      toast.info("Stopped sharing screen");
    } else {
      try {
        toast.info("Select a window or tab to share (YouTube tab is recommended)");
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        setScreenStream(stream);
        setIsScreenSharing(true);

        setTimeout(() => {
          if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = stream;
          }
        }, 300);

        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          setScreenStream(null);
        };
      } catch (err) {
        console.error(err);
        toast.error("Screen sharing cancelled");
      }
    }
  };

  const handleStartRecording = () => {
    // Record screen stream if sharing screen; otherwise record local camera stream
    const recordSourceStream = screenStream || localStream;

    if (!recordSourceStream) {
      toast.error("No active video feed to record");
      return;
    }

    recordedChunksRef.current = [];
    setIsRecording(true);
    toast.success("Recording started");

    const recorder = new MediaRecorder(recordSourceStream, {
      mimeType: "video/webm;codecs=vp9",
    });

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, {
        type: "video/webm",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `YourTube_Call_Recording_${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Recording saved and downloaded locally!");
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="flex-1 p-6 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between border-b pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              VoIP Video Room
            </h1>
            <p className="text-xs text-zinc-500">Video call and share screen with friends</p>
          </div>

          {inCall && (
            <div className="flex items-center gap-2 text-xs bg-red-100 dark:bg-red-950/30 text-red-600 px-3 py-1 rounded-full font-bold">
              <Activity className="w-3.5 h-3.5 animate-pulse" /> Live Call Active {isSimulated ? "(Simulation)" : ""}
            </div>
          )}
        </div>

        {!inCall ? (
          <div className="max-w-md mx-auto bg-white dark:bg-zinc-850 p-8 border rounded-2xl shadow-sm space-y-6">
            <div className="space-y-2 text-center">
              <h2 className="text-lg font-bold">Start or Join a Room</h2>
              <p className="text-xs text-zinc-500">Enter a Room ID to call a peer, or start the simulator.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-650 dark:text-zinc-350">Room Identifier</label>
                <Input
                  type="text"
                  placeholder="e.g. workspace-discussion"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                />
              </div>

              <div className="flex gap-4 pt-2">
                <Button
                  onClick={handleJoinCall}
                  className="flex-1 bg-red-650 hover:bg-red-750 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" /> Join Room Call
                </Button>
                <Button
                  onClick={handleStartSimulation}
                  variant="secondary"
                  className="flex-1 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-2"
                >
                  <HelpCircle className="w-4 h-4" /> Start Simulator
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Call Screen Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Local Video Panel */}
              <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border shadow">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-full text-xs font-bold text-white">
                  You ({user?.name || "Local"})
                </div>
              </div>

              {/* Remote Video Panel */}
              <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border shadow">
                {remoteStream ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 text-sm">
                    <p className="font-semibold">Waiting for friend to join...</p>
                    <p className="text-xs text-zinc-650">Share Room ID "{roomId}" to connect.</p>
                  </div>
                )}
                <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-full text-xs font-bold text-white">
                  Friend {isSimulated ? "(Simulator Peer)" : ""}
                </div>
              </div>

              {/* Shared Screen Panel */}
              {isScreenSharing && (
                <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border shadow md:col-span-2">
                  <video
                    ref={screenVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain bg-zinc-900"
                  />
                  <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-full text-xs font-bold text-white">
                    💻 Shared Screen Source (Streaming)
                  </div>
                </div>
              )}
            </div>

            {/* Call Action Controls */}
            <div className="flex flex-wrap items-center justify-center gap-4 bg-white dark:bg-zinc-850 p-4 border rounded-2xl shadow-sm">
              <Button
                variant={cameraActive ? "secondary" : "destructive"}
                onClick={handleToggleCamera}
                size="icon"
                className="rounded-full w-12 h-12"
              >
                {cameraActive ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </Button>

              <Button
                variant={micActive ? "secondary" : "destructive"}
                onClick={handleToggleMic}
                size="icon"
                className="rounded-full w-12 h-12"
              >
                {micActive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </Button>

              <Button
                variant={isScreenSharing ? "destructive" : "secondary"}
                onClick={handleToggleScreenShare}
                size="icon"
                className="rounded-full w-12 h-12"
              >
                <Monitor className="w-5 h-5" />
              </Button>

              {/* Call Recording */}
              {!isRecording ? (
                <Button
                  onClick={handleStartRecording}
                  variant="secondary"
                  className="rounded-full text-xs px-4 h-12 border flex items-center gap-2 hover:bg-zinc-100"
                >
                  <Circle className="w-4 h-4 text-red-650 fill-red-650" /> Record Session
                </Button>
              ) : (
                <Button
                  onClick={handleStopRecording}
                  variant="destructive"
                  className="rounded-full text-xs px-4 h-12 flex items-center gap-2 animate-pulse"
                >
                  <Circle className="w-4 h-4 text-white fill-white" /> Stop Recording
                </Button>
              )}

              <Button
                variant="destructive"
                onClick={stopAllStreams}
                size="icon"
                className="rounded-full w-12 h-12 bg-red-600 hover:bg-red-750"
              >
                <PhoneOff className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
