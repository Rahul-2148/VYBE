import React, { useState, useRef, useEffect } from "react";
import { MdOutlineKeyboardBackspace } from "react-icons/md";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import LoopCard from "../components/LoopCard";
import ReelPreloader from "../components/ReelPreloader";
import api from "../lib/axios";
import { setLoopData } from "../redux/features/loopSlice";

export const Loops = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();

  const targetReelId = searchParams.get("reelId") || location.state?.initialLoopId;
  const { loopData } = useSelector((state) => state.loop);
  const [currentIndex, setCurrentIndex] = useState(0);

  const containerRef = useRef(null);
  const initialScrollDone = useRef(false);

  // Load feed loops if empty
  useEffect(() => {
    if (!loopData || loopData.length === 0) {
      api
        .get("/loop/get-all-loops")
        .then((res) => {
          if (res.data?.loops) {
            dispatch(setLoopData(res.data.loops));
          }
        })
        .catch(() => {});
    }
  }, [loopData, dispatch]);

  // Target reel positioning & smooth scroll
  useEffect(() => {
    if (!targetReelId || !loopData || loopData.length === 0 || initialScrollDone.current) return;

    const idx = loopData.findIndex((l) => l._id === targetReelId);

    if (idx !== -1) {
      initialScrollDone.current = true;
      setCurrentIndex(idx);
      setTimeout(() => {
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
        .get(`/loop/${targetReelId}`)
        .then((res) => {
          if (res.data?.loop) {
            dispatch(setLoopData([res.data.loop, ...loopData]));
            setCurrentIndex(0);
            setTimeout(() => {
              containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
            }, 150);
          }
        })
        .catch(() => {});
    }
  }, [targetReelId, loopData, dispatch]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const height = containerRef.current.clientHeight;
    const scrollTop = containerRef.current.scrollTop;
    const index = Math.round(scrollTop / height);
    if (index !== currentIndex && index >= 0 && index < (loopData?.length || 0)) {
      setCurrentIndex(index);
    }
  };

  const handleNext = () => {
    if (currentIndex < (loopData?.length || 0) - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      const height = containerRef.current?.clientHeight || window.innerHeight;
      containerRef.current?.scrollTo({
        top: nextIdx * height,
        behavior: "smooth",
      });
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      const height = containerRef.current?.clientHeight || window.innerHeight;
      containerRef.current?.scrollTo({
        top: prevIdx * height,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="w-screen h-screen bg-bg overflow-hidden flex justify-center items-center">
      {/* Background Preloader for adjacent 2 videos */}
      <ReelPreloader loops={loopData || []} currentIndex={currentIndex} />

      {/* Header Bar */}
      <div className="w-full h-[70px] flex items-center gap-4 px-6 fixed top-0 left-0 z-[100] bg-gradient-to-b from-black/80 to-transparent pointer-events-auto">
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
          className="text-white p-1 hover:bg-white/10 rounded-full cursor-pointer"
          title="Go Back"
        >
          <MdOutlineKeyboardBackspace className="w-6 h-6" />
        </button>
        <h1 className="text-white text-lg font-bold">Reels & Loops</h1>
      </div>

      {/* Scrollable Container with Snap */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-screen w-full flex flex-col items-center overflow-y-scroll snap-y snap-mandatory scrollbar-none"
      >
        {loopData?.map((loop, index) => (
          <div key={loop._id || index} className="h-screen w-full flex justify-center snap-start shrink-0">
            <LoopCard loop={loop} isActive={index === currentIndex} onNext={handleNext} onPrev={handlePrev} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Loops;
