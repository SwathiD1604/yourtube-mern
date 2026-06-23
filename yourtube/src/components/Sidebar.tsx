import {
  Home,
  Compass,
  PlaySquare,
  Clock,
  ThumbsUp,
  History,
  User,
  Download,
  Sparkles,
  PhoneCall,
} from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { Button } from "./ui/button";
import Channeldialogue from "./channeldialogue";
import { useUser } from "@/lib/AuthContext";
import { useRouter } from "next/router";

const Sidebar = () => {
  const { user } = useUser();
  const router = useRouter();

  const [isdialogeopen, setisdialogeopen] = useState(false);
  return (
    <aside className="w-64 bg-[var(--background)] border-r border-[var(--border)] min-h-screen p-2 text-[var(--foreground)]">
      <nav className="space-y-1">
        <Link href="/">
          <Button variant="ghost" className="w-full justify-start text-[var(--foreground)]">
            <Home className="w-5 h-5 mr-3 text-[var(--foreground)]" />
            Home
          </Button>
        </Link>
        <Link href="/explore">
          <Button variant="ghost" className="w-full justify-start text-[var(--foreground)]">
            <Compass className="w-5 h-5 mr-3 text-[var(--foreground)]" />
            Explore
          </Button>
        </Link>
        <Link href="/subscriptions">
          <Button
            variant="ghost"
            className="w-full justify-start text-[var(--foreground)]"
            onClick={(e) => {
              if (router.pathname === "/subscriptions") {
                e.preventDefault();
              }
            }}
          >
            <PlaySquare className="w-5 h-5 mr-3" />
            Subscriptions
          </Button>
        </Link>

        {user && (
          <>
            <div className="border-t pt-2 mt-2">
              <Link href="/history">
                <Button variant="ghost" className="w-full justify-start">
                  <History className="w-5 h-5 mr-3 text-[var(--foreground)]" />
                  History
                </Button>
              </Link>
              <Link href="/liked">
                <Button variant="ghost" className="w-full justify-start">
                  <ThumbsUp className="w-5 h-5 mr-3 text-[var(--foreground)]" />
                  Liked videos
                </Button>
              </Link>
              <Link href="/watch-later">
                <Button variant="ghost" className="w-full justify-start">
                  <Clock className="w-5 h-5 mr-3 text-[var(--foreground)]" />
                  Watch later
                </Button>
              </Link>
              <Link href="/downloads">
                <Button variant="ghost" className="w-full justify-start">
                  <Download className="w-5 h-5 mr-3 text-[var(--foreground)]" />
                  Downloads
                </Button>
              </Link>
              <Link href="/upgrade">
                <Button variant="ghost" className="w-full justify-start text-red-600 hover:text-red-700 dark:text-red-400 font-semibold">
                  <Sparkles className="w-5 h-5 mr-3 text-[var(--foreground)]" />
                  Upgrade Plan
                </Button>
              </Link>
              <Link href="/calls">
                <Button variant="ghost" className="w-full justify-start">
                  <PhoneCall className="w-5 h-5 mr-3 text-[var(--foreground)]" />
                  Video Calls
                </Button>
              </Link>
              {user?.channelname ? (
                <Link href={`/channel/${user.id}`}>
                  <Button variant="ghost" className="w-full justify-start">
                    <User className="w-5 h-5 mr-3" />
                    Your channel
                  </Button>
                </Link>
              ) : (
                <div className="px-2 py-1.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => setisdialogeopen(true)}
                  >
                    Create Channel
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </nav>
      <Channeldialogue
        isopen={isdialogeopen}
        onclose={() => setisdialogeopen(false)}
        mode="create"
      />
    </aside>
  );
};

export default Sidebar;
