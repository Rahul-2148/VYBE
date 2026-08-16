import React, { useState, useRef, useEffect } from "react";
import { MdOutlineKeyboardBackspace } from "react-icons/md";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import ReelCard from "../components/ReelCard";
import ReelPreloader from "../components/ReelPreloader";
import api from "../lib/axios";
import { useGetAllReelsQuery } from "../redux/api/apiSlice";
import { setReelData } from "../redux/features/reelSlice";

export const Reels = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();

  const targetReelId = searchParams.get("reelId") || location.state?.initialReelId;
  
  // RTK Query with instant cache & stale-while-revalidate
  const { data: reelsResponse, isLoading: loadingReels } = useGetAllReelsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const reelState = useSelector((state) => state.reel);
  const reelData = reelsResponse?.reels || reelState?.reelData || [];

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
    if (reelsResponse?.reels) {
      dispatch(setReelData(reelsResponse.reels));
    }
  }, [reelsResponse, dispatch]);

  const loading = loadingReels && reelData.length === 0;

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

  const handleNext = () => {
    const total = reelData?.length || 0;
    if (total <= 1) return;
    const nextIdx = (currentIndex + 1) % total;
    setCurrentIndex(nextIdx);
    if (containerRef.current) {
      const targetElement = containerRef.current.children[nextIdx];
      if (targetElement && typeof targetElement.scrollIntoView === "function") {
        targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        const height = containerRef.current.clientHeight || window.innerHeight;
        containerRef.current.scrollTo({
          top: nextIdx * height,
          behavior: "smooth",
        });
      }
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      if (containerRef.current) {
        const targetElement = containerRef.current.children[prevIdx];
        if (targetElement && typeof targetElement.scrollIntoView === "function") {
          targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          const height = containerRef.current.clientHeight || window.innerHeight;
          containerRef.current.scrollTo({
            top: prevIdx * height,
            behavior: "smooth",
          });
        }
      }
    }
  };

  return (
    <div className="w-screen h-screen bg-black overflow-hidden flex flex-col justify-center items-center relative select-none">
      {/* Background Preloader for adjacent 2 videos */}
      {reelData && reelData.length > 0 && (
        <ReelPreloader reels={reelData} currentIndex={currentIndex} />
      )}

      {/* Header Bar */}
      <div className="w-full h-[70px] flex items-center justify-between px-4 fixed top-0 left-0 z-[100] bg-gradient-to-b from-black/80 to-transparent pointer-events-auto">
        <div className="flex items-center gap-3">
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
          <h1 className="text-white text-lg font-bold">Reels</h1>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (!reelData || reelData.length === 0) && (
        <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-white z-10">
          <div className="w-10 h-10 border-3 border-rose-500 border-t-transparent rounded-full animate-spin shadow-lg" />
          <p className="text-xs font-bold text-zinc-400 tracking-wide animate-pulse">Loading Reels...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && (!reelData || reelData.length === 0) && (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-4 text-white z-10">
          <div className="w-16 h-16 rounded-full bg-surface-overlay border border-white/15 flex items-center justify-center text-rose-500 shadow-xl">
            <span className="text-3xl">🎬</span>
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold">No Reels Yet</h2>
            <p className="text-xs text-zinc-400 max-w-xs">
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
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/15 font-bold text-xs rounded-full text-white transition cursor-pointer"
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
          className="h-screen w-full flex flex-col items-center overflow-y-scroll snap-y snap-mandatory scrollbar-none"
        >
          {reelData.map((reel, index) => (
            <div key={reel._id || index} className="h-screen w-full flex justify-center snap-start shrink-0">
              <ReelCard
                reel={reel}
                isActive={index === currentIndex}
                onNext={handleNext}
                onPrev={handlePrev}
                autoScroll={autoScroll}
                onToggleAutoScroll={toggleAutoScroll}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Reels;
