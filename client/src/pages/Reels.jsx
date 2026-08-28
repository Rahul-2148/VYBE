import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { MdOutlineKeyboardBackspace } from "react-icons/md";
import { ChevronUp, ChevronDown, Sparkles } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useLocation, useSearchParams, useParams } from "react-router-dom";
import ReelCard from "../components/ReelCard";
import ReelPreloader from "../components/ReelPreloader";
import LeftHome from "../components/LeftHome";
import RenderErrorBoundary from "../components/RenderErrorBoundary";
import api from "../lib/axios";
import { useGetAllReelsQuery } from "../redux/api/apiSlice";
import { setReelData } from "../redux/features/reelSlice";

export const Reels = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { reelId } = useParams();
  const dispatch = useDispatch();

  const targetReelId = reelId || searchParams.get("reelId") || location.state?.initialReelId;
  const reelMode = "for-you";
  
  // RTK Query with instant cache & stale-while-revalidate
  const { data: reelsResponse, isLoading: loadingReels, isFetching: isReelsFetching } = useGetAllReelsQuery(reelMode, {
    refetchOnMountOrArgChange: true,
  });

  const reelState = useSelector((state) => state.reel);
  const reelData = useMemo(
    () => (reelsResponse?.reels !== undefined ? reelsResponse.reels : reelState?.reelData || []),
    [reelsResponse, reelState?.reelData]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoScroll, setAutoScroll] = useState(() => {
    return typeof localStorage !== "undefined"
      ? localStorage.getItem("vybe_reel_auto_scroll") === "true"
      : false;
  });

  const toggleAutoScroll = () => {
    setAutoScroll((prev) => {
      const next = !prev;
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("vybe_reel_auto_scroll", String(next));
      }
      return next;
    });
  };

  const containerRef = useRef(null);
  const initialScrollDone = useRef(false);

  // Sync to Redux slice
  useEffect(() => {
    if (reelsResponse?.reels && reelsResponse.mode === reelMode) {
      dispatch(setReelData(reelsResponse.reels));
    }
  }, [reelsResponse, reelMode, dispatch]);

  const loading = (loadingReels || isReelsFetching) && reelData.length === 0;

  // Target reel positioning & smooth scroll
  useEffect(() => {
    if (!targetReelId || !reelData || reelData.length === 0 || initialScrollDone.current) return;

    const idx = reelData.findIndex((l) => l._id === targetReelId);

    if (idx !== -1) {
      initialScrollDone.current = true;
      setTimeout(() => {
        setCurrentIndex(idx);
        if (containerRef.current) {
          const height = containerRef.current.clientHeight || window.innerHeight;
          containerRef.current.scrollTo({
            top: idx * height,
            behavior: "smooth",
          });
        }
      }, 150);
    } else {
      initialScrollDone.current = true;
      api
        .get(`/reel/${targetReelId}`)
        .then((res) => {
          const fetchedReel = res.data?.reel;
          if (fetchedReel) {
            dispatch(setReelData([fetchedReel, ...reelData]));
            setTimeout(() => {
              setCurrentIndex(0);
              containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
            }, 150);
          }
        })
        .catch(() => {});
    }
  }, [targetReelId, reelData, dispatch]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const height = containerRef.current.clientHeight;
    const scrollTop = containerRef.current.scrollTop;
    const index = Math.round(scrollTop / height);
    if (index !== currentIndex && index >= 0 && index < (reelData?.length || 0)) {
      setCurrentIndex(index);
    }
  };

  const handleNext = useCallback(() => {
    if (!containerRef.current) return;
    const total = reelData?.length || 0;
    if (total <= 1) return;
    const height = containerRef.current.clientHeight || window.innerHeight;
    const currentScrollIndex = Math.round(containerRef.current.scrollTop / height);
    const nextIdx = (currentScrollIndex + 1) % total;
    setCurrentIndex(nextIdx);
    containerRef.current.scrollTo({
      top: nextIdx * height,
      behavior: "smooth",
    });
  }, [reelData?.length]);

  const handlePrev = useCallback(() => {
    if (!containerRef.current) return;
    const total = reelData?.length || 0;
    if (total <= 1) return;
    const height = containerRef.current.clientHeight || window.innerHeight;
    const currentScrollIndex = Math.round(containerRef.current.scrollTop / height);
    const prevIdx = (currentScrollIndex - 1 + total) % total;
    setCurrentIndex(prevIdx);
    containerRef.current.scrollTo({
      top: prevIdx * height,
      behavior: "smooth",
    });
  }, [reelData?.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, reelData, handleNext, handlePrev]);

  return (
    <div className="w-full h-[100dvh] bg-bg text-text overflow-hidden flex relative select-none">
      <div className="w-full h-full flex">
        {/* Fixed Left Sidebar Navigation for Desktop (Instagram Web style) */}
        <div className="hidden md:flex shrink-0 z-30">
          <LeftHome />
        </div>

        {/* Main Reels Feed Area (Centered in the remaining screen space) */}
        <div className="flex-1 h-full flex flex-col justify-center items-center relative overflow-y-hidden md:overflow-visible bg-black md:bg-bg">
          {/* Background Preloader for adjacent 2 videos */}
          {reelData && reelData.length > 0 && (
            <ReelPreloader
              reels={reelData}
              currentIndex={currentIndex}
              preloadCount={2}
            />
          )}


          {/* Back button for Mobile */}
          <div className="flex md:hidden absolute top-4 left-4 z-[100] pointer-events-auto">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  if (window.history.length > 1) {
                    navigate(-1);
                  } else if (location.state?.from) {
                    navigate(location.state.from, { replace: true });
                  } else {
                    navigate("/explore", { replace: true });
                  }
                }} 
                className="text-white p-1.5 hover:bg-white/10 rounded-full cursor-pointer active:scale-90 transition"
                title="Go Back"
              >
                <MdOutlineKeyboardBackspace className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* DESKTOP FLOATING UP/DOWN NAVIGATION CONTROLS */}
          {reelData && reelData.length > 1 && (
            <div className="hidden lg:flex flex-col gap-3 fixed right-8 top-1/2 -translate-y-1/2 z-[110] pointer-events-auto">
              <button
                disabled={currentIndex === 0}
                onClick={handlePrev}
                className="w-12 h-12 rounded-full bg-surface/90 hover:bg-surface border border-border text-text flex items-center justify-center shadow-xl backdrop-blur-md transition hover:scale-105 active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                title="Previous Reel (Up Arrow)"
              >
                <ChevronUp className="w-6 h-6" />
              </button>

              <button
                disabled={currentIndex === reelData.length - 1}
                onClick={handleNext}
                className="w-12 h-12 rounded-full bg-surface/90 hover:bg-surface border border-border text-text flex items-center justify-center shadow-xl backdrop-blur-md transition hover:scale-105 active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                title="Next Reel (Down Arrow)"
              >
                <ChevronDown className="w-6 h-6" />
              </button>
            </div>
          )}

          {/* Loading Skeleton */}
          {loading && (!reelData || reelData.length === 0) && (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-text z-10">
              <div className="w-10 h-10 border-3 border-rose-500 border-t-transparent rounded-full animate-spin shadow-lg" />
              <p className="text-xs font-bold text-text-muted tracking-wide animate-pulse">Loading Reels...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && (!reelData || reelData.length === 0) && (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-4 text-text z-10">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-xl">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-xs">
                <h2 className="text-base font-bold">No Reels Yet</h2>
                <p className="text-xs text-text-muted">
                  Be the first to share an inspiring video or discover content from creators.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => navigate("/upload")}
                  className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-purple-600 font-bold text-xs rounded-full text-white shadow-xl hover:opacity-95 transition cursor-pointer"
                >
                  Upload Reel
                </button>
                <button
                  onClick={() => navigate("/explore")}
                  className="px-5 py-2.5 bg-surface-hover hover:bg-surface-active border border-border font-bold text-xs rounded-full text-text transition cursor-pointer"
                >
                  Explore Feed
                </button>
              </div>
            </div>
          )}

          {/* Scrollable Container with Snap */}
          {reelData && reelData.length > 0 && (
            <div
              ref={containerRef}
              onScroll={handleScroll}
              className="h-[100dvh] w-full flex flex-col items-center overflow-y-scroll snap-y snap-mandatory scrollbar-none"
            >
              {reelData.map((reel, index) => (
                <div key={reel._id || index} className="h-[100dvh] w-full flex items-center justify-center snap-start snap-always shrink-0 py-0 md:py-4">
                  <RenderErrorBoundary>
                    <ReelCard
                      reel={reel}
                      isActive={index === currentIndex}
                      onNext={handleNext}
                      onPrev={handlePrev}
                      autoScroll={autoScroll}
                      onToggleAutoScroll={toggleAutoScroll}
                    />
                  </RenderErrorBoundary>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reels;

