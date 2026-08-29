import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { Loader2 } from "lucide-react";

/**
 * Instagram-Style Elastic Rubber-Band Pull-To-Refresh Component
 * Features:
 * - Damped elastic tension physics (logarithmic rubber-band feel)
 * - Proportional SVG stroke loading circle + rotation
 * - Instagram-style floating glassmorphic indicator pill
 * - Haptic feedback pulse on threshold cross (navigator.vibrate)
 * - 60/120 FPS hardware-accelerated spring recovery
 */
export const PullToRefresh = forwardRef(function PullToRefresh(
  {
    onRefresh,
    isRefreshing = false,
    children,
    className = "",
    disabled = false,
    threshold = 64,
    maxPull = 110,
    onScroll,
    style = {},
    indicatorTop = 14,
    ...restProps
  },
  forwardedRef
) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [passedThreshold, setPassedThreshold] = useState(false);

  const containerRef = useRef(null);
  useImperativeHandle(forwardedRef, () => containerRef.current);

  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const isPullingRef = useRef(false);
  const isHorizontalScrollRef = useRef(false);

  // Sync external isRefreshing state change
  const prevIsRefreshingRef = useRef(isRefreshing);
  useEffect(() => {
    if (prevIsRefreshingRef.current && !isRefreshing) {
      setRefreshing(false);
      setPullDistance(0);
      setPassedThreshold(false);
      setIsPulling(false);
    }
    prevIsRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  const handleTouchStart = useCallback(
    (e) => {
      if (disabled || refreshing) return;
      const container = containerRef.current;
      if (!container) return;

      // Only allow pull-down if container is scrolled all the way to top
      if (container.scrollTop <= 0) {
        startYRef.current = e.touches[0].clientY;
        startXRef.current = e.touches[0].clientX;
        isPullingRef.current = false;
        setIsPulling(false);
        isHorizontalScrollRef.current = false;
      }
    },
    [disabled, refreshing]
  );

  const handleTouchMove = useCallback(
    (e) => {
      if (disabled || refreshing || startYRef.current === 0) return;
      const container = containerRef.current;
      if (!container || container.scrollTop > 0) {
        if (isPullingRef.current) {
          isPullingRef.current = false;
          setIsPulling(false);
          setPullDistance(0);
        }
        return;
      }

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const deltaY = currentY - startYRef.current;
      const deltaX = currentX - startXRef.current;

      // Detect horizontal swipe (e.g. story tray or swipe back) to not hijack
      if (!isPullingRef.current && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 12) {
        isHorizontalScrollRef.current = true;
        return;
      }

      if (isHorizontalScrollRef.current) return;

      if (deltaY > 0 && container.scrollTop <= 0) {
        // Prevent native overscroll / pull behavior if pulling down
        if (e.cancelable && deltaY > 6) {
          e.preventDefault();
        }

        isPullingRef.current = true;
        setIsPulling(true);
        // Instagram elastic logarithmic rubber-band formula
        const damped = Math.min(maxPull, Math.pow(deltaY, 0.82) * 1.55);
        setPullDistance(damped);

        const hasPassed = damped >= threshold;
        if (hasPassed !== passedThreshold) {
          setPassedThreshold(hasPassed);
          if (hasPassed && typeof navigator !== "undefined" && navigator.vibrate) {
            try {
              navigator.vibrate(12);
            } catch {
              // Ignore vibration errors
            }
          }
        }
      }
    },
    [disabled, refreshing, maxPull, threshold, passedThreshold]
  );

  const handleTouchEnd = useCallback(async () => {
    if (disabled || refreshing || !isPullingRef.current) {
      startYRef.current = 0;
      isPullingRef.current = false;
      setIsPulling(false);
      setPullDistance(0);
      return;
    }

    isPullingRef.current = false;
    setIsPulling(false);
    startYRef.current = 0;

    if (passedThreshold) {
      setRefreshing(true);
      setPullDistance(threshold * 0.82); // Hold at spinner resting position

      try {
        if (onRefresh) {
          await onRefresh();
        }
      } finally {
        setTimeout(() => {
          setRefreshing(false);
          setPullDistance(0);
          setPassedThreshold(false);
        }, 350);
      }
    } else {
      setPullDistance(0);
      setPassedThreshold(false);
    }
  }, [disabled, refreshing, passedThreshold, threshold, onRefresh]);

  const progress = Math.min(1, pullDistance / threshold);
  const strokeDash = 56.5; // circumference for r=9
  const strokeOffset = strokeDash * (1 - progress);

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={style}
      className={`relative overflow-y-auto ${className}`}
      {...restProps}
    >
      {/* Instagram-Style Floating Pull Indicator */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-50 pointer-events-none"
        style={{
          top: indicatorTop,
          transform: `translate(-50%, ${pullDistance > 0 || refreshing ? pullDistance : -52}px) scale(${
            refreshing ? 1 : Math.max(0.35, Math.min(1, progress * 1.1))
          })`,
          opacity: pullDistance > 6 || refreshing ? 1 : 0,
          transition: isPulling
            ? "none"
            : "transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.25s ease",
        }}
      >
        <div
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-xl backdrop-blur-xl border transition-all duration-200 ${
            passedThreshold || refreshing
              ? "bg-surface border-rose-500/60 shadow-rose-500/25 text-rose-500 ring-2 ring-rose-500/25"
              : "bg-surface/95 border-border/80 text-text-secondary shadow-black/15"
          }`}
        >
          {refreshing ? (
            <Loader2 className="w-5 h-5 animate-spin text-rose-500 stroke-[2.5]" />
          ) : (
            <svg
              className="w-5 h-5 -rotate-90 transition-transform"
              style={{
                transform: `rotate(${pullDistance * 3.2 - 90}deg)`,
              }}
              viewBox="0 0 24 24"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeDasharray={strokeDash}
                strokeDashoffset={strokeOffset}
                strokeLinecap="round"
                opacity={Math.max(0.25, progress)}
              />
            </svg>
          )}
        </div>
      </div>

      {/* Rubber-band translated content wrapper */}
      <div
        style={{
          transform: `translateY(${pullDistance > 0 ? pullDistance * 0.36 : 0}px)`,
          transition: isPulling
            ? "none"
            : "transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        }}
        className="w-full min-h-full flex flex-col items-center"
      >
        {children}
      </div>
    </div>
  );
});

export default PullToRefresh;
