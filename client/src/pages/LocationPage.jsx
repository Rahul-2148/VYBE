import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MapPin,
  ArrowLeft,
  Heart,
  MessageCircle,
  Video,
  Image as ImageIcon,
  ExternalLink,
  Navigation,
  Share2,
  Bookmark,
  BookmarkCheck,
  Layers,
  Maximize2,
  Minimize2,
  Crosshair,
  Sparkles,
  Users,
  Compass,
  Play,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { snackbar } from "../lib/snackbar";
import api from "../lib/axios";
import { searchPlaces, getDirectionsUrl } from "../lib/locationService";
import ShareSheet from "../components/ShareSheet";
import { triggerHaptic, microAudio } from "../lib/interactiveEffects";
import dp from "../assets/dp3.png";

export const LocationPage = () => {
  const { locationName } = useParams();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [reels, setReels] = useState([]);
  const [topPosts, setTopPosts] = useState([]);
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("top"); // "top" | "posts" | "reels"

  // Geocoded Place Coordinates & Metadata
  const [placeMeta, setPlaceMeta] = useState(null);
  const [mapType, setMapType] = useState("streets"); // "streets" | "dark" | "satellite"
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  // Saved Location Bookmark state
  const [isSaved, setIsSaved] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("vybe_saved_places") || "[]");
      return saved.some((p) => p.name === decodeURIComponent(locationName || ""));
    } catch {
      return false;
    }
  });

  const [showShareSheet, setShowShareSheet] = useState(false);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const tileLayerRef = useRef(null);

  const cleanLocationName = decodeURIComponent(locationName || "Unknown Place");

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      api.get(`/search/location/${encodeURIComponent(locationName)}`).catch(() => null),
      searchPlaces(cleanLocationName, { limit: 1 }).catch(() => null),
    ])
      .then(([res, geoResults]) => {
        if (!isMounted) return;
        if (res?.data?.success) {
          setPosts(res.data.posts || []);
          setReels(res.data.reels || []);
          setTopPosts(res.data.topPosts || res.data.posts?.slice(0, 9) || []);
          setCreators(res.data.creators || []);
        }
        if (geoResults && geoResults.length > 0) {
          setPlaceMeta(geoResults[0]);
        } else {
          setPlaceMeta({
            name: cleanLocationName,
            title: cleanLocationName.split(",")[0],
            subtitle: cleanLocationName.split(",").slice(1).join(", "),
            latitude: 19.076,
            longitude: 72.8777,
            category: "Place",
          });
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [locationName, cleanLocationName]);

  // 3. Initialize Interactive Leaflet Map
  useEffect(() => {
    if (!placeMeta || !mapContainerRef.current) return;

    const lat = placeMeta.latitude || 19.076;
    const lng = placeMeta.longitude || 72.8777;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 14,
      zoomControl: false,
    });
    mapRef.current = map;

    // Tile layers
    const tileUrl =
      mapType === "dark"
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : mapType === "satellite"
        ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    const tileLayer = L.tileLayer(tileUrl, {
      attribution: "&copy; OpenStreetMap &copy; CARTO",
      maxZoom: 19,
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    // Authentic Instagram / Apple Maps Teardrop Marker
    const customIcon = L.divIcon({
      className: "vybe-instagram-pin",
      html: `
        <div class="relative flex flex-col items-center -translate-x-1/2 -translate-y-full cursor-pointer group">
          <div class="w-9 h-11 relative drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] transform transition-transform group-hover:scale-110">
            <svg viewBox="0 0 24 32" class="w-full h-full fill-rose-600 stroke-white stroke-[1.8]">
              <path d="M12 0C5.373 0 0 5.373 0 12c0 9.5 12 20 12 20s12-10.5 12-20c0-6.627-5.373-12-12-12z"/>
            </svg>
            <div class="absolute top-[8px] left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow-inner flex items-center justify-center">
              <div class="w-1.5 h-1.5 rounded-full bg-rose-600"></div>
            </div>
          </div>
          <div class="w-3.5 h-1.5 rounded-full bg-black/40 blur-[1px] -mt-0.5"></div>
        </div>
      `,
      iconSize: [0, 0],
    });

    const marker = L.marker([lat, lng], {
      icon: customIcon,
    }).addTo(map);
    markerRef.current = marker;

    const popupHtml = `
      <div style="font-family: sans-serif; padding: 4px; color: #111;">
        <h4 style="margin: 0; font-weight: 800; font-size: 13px;">${placeMeta.title || cleanLocationName}</h4>
        <p style="margin: 2px 0 0 0; font-size: 11px; opacity: 0.7;">${posts.length + reels.length} Vybe posts & reels</p>
      </div>
    `;
    marker.bindPopup(popupHtml);

    const t = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(t);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [placeMeta, isMapExpanded, cleanLocationName, mapType, posts.length, reels.length]);

  // Toggle Map Style
  const handleToggleMapType = () => {
    triggerHaptic("light");
    const nextType = mapType === "streets" ? "dark" : mapType === "dark" ? "satellite" : "streets";
    setMapType(nextType);

    if (mapRef.current && tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
      const tileUrl =
        nextType === "dark"
          ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          : nextType === "satellite"
          ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

      tileLayerRef.current = L.tileLayer(tileUrl, {
        attribution: "&copy; OpenStreetMap &copy; CARTO",
        maxZoom: 19,
      }).addTo(mapRef.current);
    }
  };

  // Recenter Map
  const handleRecenter = () => {
    triggerHaptic("light");
    if (mapRef.current && placeMeta?.latitude && placeMeta?.longitude) {
      mapRef.current.setView([placeMeta.latitude, placeMeta.longitude], 15, { animate: true });
    }
  };

  // Toggle Save Place
  const handleToggleSave = () => {
    triggerHaptic("medium");
    microAudio.playPop();
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);

    try {
      const savedList = JSON.parse(localStorage.getItem("vybe_saved_places") || "[]");
      let updated;
      if (nextSaved) {
        updated = [
          {
            name: cleanLocationName,
            title: placeMeta?.title || cleanLocationName,
            subtitle: placeMeta?.subtitle || "",
            latitude: placeMeta?.latitude,
            longitude: placeMeta?.longitude,
            savedAt: new Date().toISOString(),
          },
          ...savedList.filter((p) => p.name !== cleanLocationName),
        ];
        snackbar.success("Saved to your Places Collection! 📍");
      } else {
        updated = savedList.filter((p) => p.name !== cleanLocationName);
        snackbar("Removed from saved places");
      }
      localStorage.setItem("vybe_saved_places", JSON.stringify(updated));
    } catch {
      /* ignore storage serialization error */
    }
  };

  const displayItems = activeTab === "top" ? topPosts : activeTab === "posts" ? posts : reels;

  return (
    <div className="min-h-screen bg-bg text-text p-4 md:p-8 max-w-5xl mx-auto space-y-6 select-none font-sans">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 text-text-secondary hover:text-text rounded-full hover:bg-surface-hover transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-black tracking-tight flex items-center gap-1.5">
              <span>Location</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                Explore
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowShareSheet(true)}
            className="p-2.5 rounded-full text-text-secondary hover:text-text hover:bg-surface-hover transition cursor-pointer"
            title="Share Place"
          >
            <Share2 className="w-5 h-5" />
          </button>
          <button
            onClick={handleToggleSave}
            className={`p-2.5 rounded-full transition cursor-pointer ${
              isSaved ? "text-amber-400 bg-amber-500/10" : "text-text-secondary hover:text-text hover:bg-surface-hover"
            }`}
            title={isSaved ? "Saved" : "Save Place"}
          >
            {isSaved ? <BookmarkCheck className="w-5 h-5 text-amber-400" /> : <Bookmark className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* HERO BANNER & INTERACTIVE REAL MAP */}
      <div className="relative overflow-hidden rounded-3xl bg-surface border border-border shadow-2xl flex flex-col md:flex-row">
        {/* Left Info Panel */}
        <div className="p-6 md:p-8 flex-1 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/25 shrink-0">
                <MapPin className="w-5 h-5 fill-white/20" />
              </div>
              <div className="truncate">
                <span className="text-[10px] uppercase font-black text-rose-400 tracking-wider">
                  {placeMeta?.category || "Place / Landmark"}
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-text tracking-tight truncate max-w-md">
                  {placeMeta?.title || cleanLocationName.split(",")[0]}
                </h2>
              </div>
            </div>

            {placeMeta?.subtitle && (
              <p className="text-xs text-text-secondary font-medium leading-relaxed">
                {placeMeta.subtitle}
              </p>
            )}

            <div className="flex items-center gap-4 text-xs text-text-muted font-semibold pt-1">
              <span>📸 {posts.length} {posts.length === 1 ? "post" : "posts"}</span>
              <span>🎬 {reels.length} {reels.length === 1 ? "reel" : "reels"}</span>
              {creators.length > 0 && <span>👥 {creators.length}+ creators</span>}
            </div>

            {/* Creators Cluster */}
            {creators.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <div className="flex -space-x-2 overflow-hidden">
                  {creators.slice(0, 5).map((c) => (
                    <img
                      key={c._id}
                      src={c.profileImage?.url || dp}
                      alt={c.userName}
                      title={`@${c.userName}`}
                      onClick={() => navigate(`/profile/${c.userName}`)}
                      className="inline-block h-6 w-6 rounded-full ring-2 ring-surface object-cover cursor-pointer hover:scale-110 transition"
                    />
                  ))}
                </div>
                <span className="text-[10px] text-text-muted font-medium">shared memories here</span>
              </div>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            {placeMeta && (
              <a
                href={getDirectionsUrl(placeMeta.latitude, placeMeta.longitude, cleanLocationName)}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:opacity-95 text-white font-black text-xs shadow-lg shadow-rose-500/20 transition flex items-center gap-1.5 cursor-pointer active:scale-98"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Get Directions</span>
              </a>
            )}

            <button
              onClick={handleToggleSave}
              className={`px-4 py-2.5 rounded-full border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                isSaved
                  ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                  : "bg-surface-inset border-border hover:bg-surface-hover text-text"
              }`}
            >
              {isSaved ? <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" /> : <Bookmark className="w-3.5 h-3.5" />}
              <span>{isSaved ? "Saved" : "Save Place"}</span>
            </button>

            <button
              onClick={() => setShowShareSheet(true)}
              className="px-4 py-2.5 rounded-full border border-border bg-surface-inset hover:bg-surface-hover text-text text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-98"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          </div>
        </div>

        {/* Right Interactive Leaflet Real Map Panel */}
        <div
          className={`relative border-t md:border-t-0 md:border-l border-border transition-all duration-300 bg-surface-inset overflow-hidden ${
            isMapExpanded ? "h-96 md:h-auto md:w-3/5" : "h-56 md:h-auto md:w-2/5 min-w-[280px]"
          }`}
        >
          <div ref={mapContainerRef} className="w-full h-full z-10 min-h-[220px]" />

          {/* Floating Map Controls */}
          <div className="absolute top-3 right-3 z-40 flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleMapType}
              className="p-2 rounded-xl bg-black/75 hover:bg-black text-white text-xs font-bold border border-white/20 backdrop-blur-md shadow-lg transition cursor-pointer active:scale-95"
              title="Toggle Map Style (Street / Dark / Satellite)"
            >
              <Layers className="w-3.5 h-3.5 text-rose-400" />
            </button>

            <button
              type="button"
              onClick={handleRecenter}
              className="p-2 rounded-xl bg-black/75 hover:bg-black text-white text-xs font-bold border border-white/20 backdrop-blur-md shadow-lg transition cursor-pointer active:scale-95"
              title="Recenter Radar Pin"
            >
              <Crosshair className="w-3.5 h-3.5 text-rose-400" />
            </button>

            <button
              type="button"
              onClick={() => setIsMapExpanded((prev) => !prev)}
              className="p-2 rounded-xl bg-black/75 hover:bg-black text-white text-xs font-bold border border-white/20 backdrop-blur-md shadow-lg transition cursor-pointer active:scale-95"
              title={isMapExpanded ? "Shrink Map" : "Expand Map"}
            >
              {isMapExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="absolute bottom-2.5 left-2.5 z-40 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-semibold text-white/90 shadow pointer-events-none flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
            <span>Live Interactive Map</span>
          </div>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => setActiveTab("top")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black transition cursor-pointer ${
            activeTab === "top" ? "bg-text text-bg shadow" : "text-text-secondary hover:text-text hover:bg-surface"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Top ({topPosts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("posts")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black transition cursor-pointer ${
            activeTab === "posts" ? "bg-text text-bg shadow" : "text-text-secondary hover:text-text hover:bg-surface"
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Posts ({posts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("reels")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black transition cursor-pointer ${
            activeTab === "reels" ? "bg-text text-bg shadow" : "text-text-secondary hover:text-text hover:bg-surface"
          }`}
        >
          <Video className="w-4 h-4" />
          <span>Reels ({reels.length})</span>
        </button>
      </div>

      {/* CONTENT GRID */}
      <div>
        {loading ? (
          <div className="text-center py-20 text-text-muted space-y-3">
            <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold">Discovering memories at {cleanLocationName}...</p>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="text-center py-16 text-text-muted space-y-2">
            <MapPin className="w-10 h-10 mx-auto text-text-muted" />
            <p className="text-sm font-bold">No {activeTab} tagged at this location yet</p>
            <p className="text-xs text-text-secondary">Be the first to create a post or reel at {cleanLocationName}!</p>
          </div>
        ) : activeTab === "reels" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {reels.map((reel) => (
              <div
                key={reel._id}
                onClick={() => navigate(`/reel/${reel._id}`)}
                className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-surface border border-border cursor-pointer group shadow-lg"
              >
                <video src={reel.media?.url} className="w-full h-full object-cover" />

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <Play className="w-10 h-10 text-white fill-white shadow-xl" />
                </div>

                <div className="absolute bottom-2 left-2 right-2 text-[10px] text-white font-bold flex items-center justify-between">
                  <span className="truncate">@{reel.author?.userName}</span>
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3 fill-white" /> {reel.likes?.length || 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {displayItems.map((item) => (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => {
                  if (item.videoDuration || item.mediaType === "video") {
                    navigate(`/reel/${item._id}`);
                  } else {
                    navigate(`/post/${item._id}`);
                  }
                }}
                className="relative aspect-square rounded-2xl overflow-hidden bg-surface border border-border cursor-pointer group shadow-lg"
              >
                {item.mediaType === "video" ? (
                  <video src={item.media?.url} className="w-full h-full object-cover" />
                ) : (
                  <img
                    src={item.media?.[0]?.url || item.media?.url || item.imageUrl || dp}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}

                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-5 font-bold text-xs text-white">
                  <div className="flex items-center gap-1">
                    <Heart className="w-4 h-4 fill-white" />
                    <span>{item.likes?.length || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4 fill-white" />
                    <span>{item.comments?.length || 0}</span>
                  </div>
                </div>

                <div className="absolute bottom-2 left-2 right-2 text-[10px] text-white font-bold opacity-0 group-hover:opacity-100 transition truncate">
                  @{item.author?.userName}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Share Sheet Modal */}
      {showShareSheet && (
        <ShareSheet
          open={showShareSheet}
          onClose={() => setShowShareSheet(false)}
          entity={{
            _id: cleanLocationName,
            id: cleanLocationName,
            title: placeMeta?.title || cleanLocationName,
            caption: `Explore ${cleanLocationName} on VYBE 📍`,
            author: {
              userName: placeMeta?.category || "Location",
              name: cleanLocationName,
              profileImage: { url: "" },
            },
            mediaUrl: posts[0]?.media?.url || reels[0]?.media?.url || "",
          }}
          entityType="location"
        />
      )}
    </div>
  );
};

export default LocationPage;
