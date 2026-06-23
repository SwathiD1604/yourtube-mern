import { Bell, Menu, Mic, Search, User, VideoIcon, MapPin, Clock } from "lucide-react";
import React, { useState } from "react";
import { Button } from "./ui/button";
import Link from "next/link";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import Channeldialogue from "./channeldialogue";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";
import LoginModal from "./LoginModal";

const Header = () => {
  const { user, logout, regionState, setRegionState, timeMode, setTimeMode } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [isdialogeopen, setisdialogeopen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const router = useRouter();
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };
  const handleKeypress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch(e as any);
    }
  };
  return (
    <header className="flex items-center justify-between px-4 py-2 bg-[var(--background)] border-b border-[var(--border)] text-[var(--foreground)]">
      <div className="flex items-center gap-4">
        <Button aria-label="Open menu" variant="ghost" size="icon" className="hover:bg-zinc-100 dark:hover:bg-zinc-800"><Menu className="w-6 h-6 text-[var(--foreground)]" /></Button>
        <Link href="/" className="flex items-center gap-1">
          <div className="bg-red-600 p-1 rounded">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </div>
          <span className="text-xl font-medium">YourTube</span>
          <span className="text-xs text-gray-400 ml-1">IN</span>
        </Link>
      </div>
      <form
        onSubmit={handleSearch}
        className="flex items-center gap-2 flex-1 max-w-2xl mx-4"
      >
        <div className="flex flex-1">
          <Input
            type="search"
            placeholder="Search"
            value={searchQuery}
            onKeyPress={handleKeypress}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-l-full border-r-0 focus-visible:ring-0 bg-[var(--background)]"
          />
          <Button
            type="submit"
            aria-label="Search"
            className="rounded-r-full px-6 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-l-0"
          >
            <Search className="w-5 h-5" />
          </Button>
        </div>
        <Button aria-label="Start voice search" variant="ghost" size="icon" className="rounded-full"><Mic className="w-5 h-5 text-[var(--foreground)]" /></Button>
      </form>
      <div className="flex items-center gap-2">
        {user ? (
          <>
            {/* Control Panel in Header for logged in user */}
            <div className="hidden md:flex items-center gap-2 border border-zinc-200 dark:border-zinc-800 rounded-full px-3 py-1 bg-zinc-50 dark:bg-zinc-800 text-[10px] font-semibold text-zinc-650 dark:text-zinc-350">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-red-600" />
                <select
                  aria-label="Select region"
                  value={regionState}
                  onChange={(e) => setRegionState(e.target.value)}
                  className="bg-transparent border-0 outline-none cursor-pointer pr-1"
                >
                  <option value="Tamil Nadu">Tamil Nadu (South)</option>
                  <option value="Kerala">Kerala (South)</option>
                  <option value="Delhi">Delhi (North)</option>
                  <option value="Maharashtra">Maharashtra (West)</option>
                </select>
              </span>
              <div className="w-px h-3 bg-zinc-300 dark:bg-zinc-700" />
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-500" />
                <select
                  aria-label="Select time mode"
                  value={timeMode}
                  onChange={(e) => setTimeMode(e.target.value)}
                  className="bg-transparent border-0 outline-none cursor-pointer pr-1"
                >
                  <option value="system">System Time</option>
                  <option value="force-light">Force 11 AM (Light)</option>
                  <option value="force-dark">Force 9 PM (Dark)</option>
                </select>
              </span>
            </div>

            <Button variant="ghost" size="icon" className="hover:bg-zinc-150 dark:hover:bg-zinc-800">
              <VideoIcon className="w-6 h-6 text-[var(--foreground)]" />
            </Button>
            <Button variant="ghost" size="icon" className="hover:bg-zinc-150 dark:hover:bg-zinc-800">
              <Bell className="w-6 h-6 text-[var(--foreground)]" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image} />
                    <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-white dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100" align="end" forceMount>
                {user?.channelname ? (
                  <DropdownMenuItem asChild>
                    <Link href={`/channel/${user?._id}`}>Your channel</Link>
                  </DropdownMenuItem>
                ) : (
                  <div className="px-2 py-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => setisdialogeopen(true)}
                    >
                      Create Channel
                    </Button>
                  </div>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/history">History</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/liked">Liked videos</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/watch-later">Watch later</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/downloads">Downloads</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/upgrade" className="text-red-650 font-semibold dark:text-red-400">Upgrade Plan</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800" />
                <DropdownMenuItem onClick={logout}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <>
            {/* Manual Location & Time Testing Control Panel */}
            <div className="hidden md:flex items-center gap-2 border border-zinc-200 dark:border-zinc-800 rounded-full px-3 py-1 bg-zinc-50 dark:bg-zinc-800 text-[10px] font-semibold text-zinc-650 dark:text-zinc-350">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-red-600" />
                <select
                  aria-label="Select region"
                  value={regionState}
                  onChange={(e) => setRegionState(e.target.value)}
                  className="bg-transparent border-0 outline-none cursor-pointer pr-1"
                >
                  <option value="Tamil Nadu">Tamil Nadu (South)</option>
                  <option value="Kerala">Kerala (South)</option>
                  <option value="Delhi">Delhi (North)</option>
                  <option value="Maharashtra">Maharashtra (West)</option>
                </select>
              </span>
              <div className="w-px h-3 bg-zinc-300 dark:bg-zinc-700" />
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-500" />
                <select
                  aria-label="Select time mode"
                  value={timeMode}
                  onChange={(e) => setTimeMode(e.target.value)}
                  className="bg-transparent border-0 outline-none cursor-pointer pr-1"
                >
                  <option value="system">System Time</option>
                  <option value="force-light">Force 11 AM (Light)</option>
                  <option value="force-dark">Force 9 PM (Dark)</option>
                </select>
              </span>
            </div>

            <Button
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-semibold px-4"
              onClick={() => setIsLoginModalOpen(true)}
            >
              <User className="w-4 h-4" />
              Sign in
            </Button>
          </>
        )}{" "}
      </div>
      <Channeldialogue
        isopen={isdialogeopen}
        onclose={() => setisdialogeopen(false)}
        mode="create"
      />
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </header>
  );
};

export default Header;
