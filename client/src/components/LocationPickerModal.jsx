import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  X,
  Search,
  Check,
  Crosshair,
  Loader2,
  ChevronRight,
  Navigation,
  Building2,
  Sparkles,
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  searchPlaces,
  reverseGeocode,
  getNearbyPlaces,
  getCurrentGPSLocation,
} from "../lib/locationService";
import { triggerHaptic, microAudio } from "../lib/interactiveEffects";
import { snackbar } from "../lib/snackbar";

export const LocationPickerModal = ({
  isOpen,
  onClose,
  onSendLocation,
  initialLocation = null,
  title = "Add Location",
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [placesList, setPlacesList] = useState([]);
  const [searching, setSearching] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Selected Place State
  const [selectedPlace, setSelectedPlace] = useState(() => {
    if (initialLocation?.latitude && initialLocation?.longitude) {
      return {
        name: initialLocation.name || "Selected Location",
        title: initialLocation.title || initialLocation.name || "Location",
        subtitle: initialLocation.subtitle || "",
        latitude: initialLocation.latitude,
        longitude: initialLocation.longitude,
      };
    }
    return {
      name: initialLocation?.name || "",
      title: initialLocation?.name || "",
      subtitle: "",
      latitude: null,
      longitude: null,
    };
  });

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const userGpsCircleRef = useRef(null);

  // Helper to create the authentic Instagram Teardrop Pin Marker
  const createInstagramPinIcon = () => {
    return L.divIcon({
      className: "vybe-instagram-pin",
      html: `
        <div class="relative flex flex-col items-center -translate-x-1/2 -translate-y-full cursor-grab group">
          <!-- Teardrop Pin Body -->
          <div class="w-8 h-10 relative drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] transform transition-transform group-hover:scale-110">
            <svg viewBox="0 0 24 32" class="w-full h-full fill-rose-600 stroke-white stroke-[1.8] paint-order-stroke">
              <path d="M12 0C5.373 0 0 5.373 0 12c0 9.5 12 20 12 20s12-10.5 12-20c0-6.627-5.373-12-12-12z"/>
            </svg>
            <!-- Inner White Dot -->
            <div class="absolute top-[8px] left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow-inner flex items-center justify-center">
              <div class="w-1.5 h-1.5 rounded-full bg-rose-600"></div>
            </div>
          </div>
          <!-- Ground Shadow -->
          <div class="w-3 h-1.5 rounded-full bg-black/40 blur-[1px] -mt-0.5"></div>
        </div>
      `,
      iconSize: [0, 0],
    });
  };

  // Helper to create User GPS Pulsing Dot
  const createUserGpsDotIcon = () => {
    return L.divIcon({
      className: "user-gps-dot",
      html: `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
          <div class="absolute w-8 h-8 rounded-full bg-blue-500/25 animate-ping"></div>
          <div class="relative w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white shadow-md"></div>
        </div>
      `,
      iconSize: [0, 0],
    });
  };

  // Load nearby places for given coordinates
  const loadNearbyPlacesForCoords = useCallback(async (lat, lon) => {
    try {
      setSearching(true);
      const nearby = await getNearbyPlaces(lat, lon);
      setPlacesList(nearby || []);
    } catch {
      setPlacesList([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;
    if (mapRef.current) return;

    const defaultLat = selectedPlace.latitude || 28.6139;
    const defaultLng = selectedPlace.longitude || 77.209;

    const map = L.map(mapContainerRef.current, {
      center: [defaultLat, defaultLng],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });
    mapRef.current = map;

    // Clean, high-res tile layer
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);

    // Add Instagram Pin Marker
    const marker = L.marker([defaultLat, defaultLng], {
      icon: createInstagramPinIcon(),
      draggable: true,
      zIndexOffset: 1000,
    }).addTo(map);
    markerRef.current = marker;

    // Drag marker event -> Reverse geocode & load nearby places
    marker.on("dragend", async () => {
      const pos = marker.getLatLng();
      triggerHaptic("selection");
      const rev = await reverseGeocode(pos.lat, pos.lng);
      if (rev) {
        setSelectedPlace(rev);
        loadNearbyPlacesForCoords(pos.lat, pos.lng);
      }
    });

    // Map click event -> Move pin & reverse geocode
    map.on("click", async (e) => {
      const { lat, lng } = e.latlng;
      triggerHaptic("light");
      marker.setLatLng([lat, lng]);
      map.panTo([lat, lng], { animate: true });
      const rev = await reverseGeocode(lat, lng);
      if (rev) {
        setSelectedPlace(rev);
        loadNearbyPlacesForCoords(lat, lng);
      }
    });

    const t = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(t);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        userGpsCircleRef.current = null;
      }
    };
  }, [isOpen, selectedPlace.latitude, selectedPlace.longitude, loadNearbyPlacesForCoords]);

  // Auto-Detect GPS Location on Mount if no coordinate is provided
  useEffect(() => {
    if (!isOpen) return;

    const autoLocate = async () => {
      // If initial text is provided without coordinates, search it
      if (initialLocation?.name && !initialLocation?.latitude) {
        try {
          setSearching(true);
          const results = await searchPlaces(initialLocation.name, { limit: 8 });
          if (results && results.length > 0) {
            const first = results[0];
            setSelectedPlace(first);
            setPlacesList(results);
            if (mapRef.current && first.latitude && first.longitude) {
              mapRef.current.setView([first.latitude, first.longitude], 15);
              if (markerRef.current) markerRef.current.setLatLng([first.latitude, first.longitude]);
            }
          }
        } catch {
          // Search fallback
        } finally {
          setSearching(false);
        }
        return;
      }

      // If coordinates already exist, load nearby
      if (selectedPlace.latitude && selectedPlace.longitude) {
        loadNearbyPlacesForCoords(selectedPlace.latitude, selectedPlace.longitude);
        return;
      }

      // Otherwise automatically locate the user's real GPS position!
      try {
        setGpsLoading(true);
        const coords = await getCurrentGPSLocation({ timeout: 8000 });

        if (mapRef.current) {
          mapRef.current.flyTo([coords.latitude, coords.longitude], 16, { duration: 1.2 });

          if (markerRef.current) {
            markerRef.current.setLatLng([coords.latitude, coords.longitude]);
          }

          // Add user blue dot
          if (userGpsCircleRef.current) {
            mapRef.current.removeLayer(userGpsCircleRef.current);
          }
          const userGpsMarker = L.marker([coords.latitude, coords.longitude], {
            icon: createUserGpsDotIcon(),
            interactive: false,
          }).addTo(mapRef.current);
          userGpsCircleRef.current = userGpsMarker;
        }

        const rev = await reverseGeocode(coords.latitude, coords.longitude);
        if (rev) {
          setSelectedPlace(rev);
        }
        loadNearbyPlacesForCoords(coords.latitude, coords.longitude);
      } catch (err) {
        console.warn("Auto-GPS fallback:", err);
        // Fallback default coordinates
        loadNearbyPlacesForCoords(28.6139, 77.209);
      } finally {
        setGpsLoading(false);
      }
    };

    autoLocate();
  }, [isOpen, initialLocation?.latitude, initialLocation?.name, selectedPlace.latitude, selectedPlace.longitude, loadNearbyPlacesForCoords]);

  // Handle Search Input Change
  useEffect(() => {
    if (!isOpen) return;
    if (!searchQuery.trim()) {
      if (selectedPlace.latitude && selectedPlace.longitude) {
        const timer = setTimeout(() => {
          loadNearbyPlacesForCoords(selectedPlace.latitude, selectedPlace.longitude);
        }, 0);
        return () => clearTimeout(timer);
      }
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchPlaces(searchQuery, { limit: 12 });
        setPlacesList(results || []);
      } catch {
        setPlacesList([]);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, isOpen, selectedPlace.latitude, selectedPlace.longitude, loadNearbyPlacesForCoords]);

  // Handle GPS Recenter Button Click
  const handleRecenterGPS = async () => {
    try {
      setGpsLoading(true);
      triggerHaptic("selection");
      const coords = await getCurrentGPSLocation();

      if (mapRef.current) {
        mapRef.current.flyTo([coords.latitude, coords.longitude], 16, { duration: 1 });
        if (markerRef.current) {
          markerRef.current.setLatLng([coords.latitude, coords.longitude]);
        }
        if (userGpsCircleRef.current) {
          userGpsCircleRef.current.setLatLng([coords.latitude, coords.longitude]);
        }
      }

      const rev = await reverseGeocode(coords.latitude, coords.longitude);
      if (rev) {
        setSelectedPlace(rev);
        snackbar.success(`Located at ${rev.title}! 📍`);
      }
      loadNearbyPlacesForCoords(coords.latitude, coords.longitude);
    } catch (e) {
      snackbar.error(e.message || "Failed to retrieve live GPS position.");
    } finally {
      setGpsLoading(false);
    }
  };

  // Select Place from List
  const handleSelectPlaceItem = (place) => {
    triggerHaptic("medium");
    microAudio.playPop();
    setSelectedPlace(place);

    if (mapRef.current && place.latitude && place.longitude) {
      mapRef.current.flyTo([place.latitude, place.longitude], 16, { duration: 0.8 });
      if (markerRef.current) {
        markerRef.current.setLatLng([place.latitude, place.longitude]);
      }
    }
  };

  // Confirm and Return Location
  const handleConfirm = (placeToConfirm = selectedPlace) => {
    if (!placeToConfirm?.title && !placeToConfirm?.name) {
      snackbar.error("Please pick a valid location.");
      return;
    }
    triggerHaptic("medium");
    microAudio.playPop();
    if (onSendLocation) {
      onSendLocation({
        name: placeToConfirm.name || placeToConfirm.title,
        title: placeToConfirm.title || placeToConfirm.name,
        subtitle: placeToConfirm.subtitle || "",
        latitude: placeToConfirm.latitude,
        longitude: placeToConfirm.longitude,
        city: placeToConfirm.city || "",
        country: placeToConfirm.country || "",
        category: placeToConfirm.category || "Place",
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[600] flex items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md select-none font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ type: "spring", damping: 28, stiffness: 350 }}
          className="relative w-full max-w-lg h-full sm:h-[88vh] max-h-[750px] bg-surface sm:border sm:border-border sm:rounded-3xl text-text shadow-2xl flex flex-col overflow-hidden"
        >
          {/* INSTAGRAM STYLE TOP HEADER BAR */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border bg-surface shrink-0 z-20">
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-text hover:text-rose-500 transition cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-base font-black tracking-tight text-text text-center">
              {title}
            </h2>

            <button
              type="button"
              onClick={() => handleConfirm(selectedPlace)}
              disabled={!selectedPlace.title && !selectedPlace.name}
              className="text-xs font-black text-rose-500 hover:text-rose-400 disabled:opacity-40 transition cursor-pointer px-2 py-1"
            >
              Done
            </button>
          </div>

          {/* SEARCH BAR (INSTAGRAM EXACT) */}
          <div className="px-4 py-2.5 bg-surface border-b border-border/80 shrink-0 z-20">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Find a location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-inset border border-border/80 focus:border-rose-500 pl-10 pr-9 py-2 rounded-xl text-xs text-text outline-none transition shadow-inner font-medium"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* REAL INTERACTIVE LEAFLET MAP VIEW */}
          <div className="relative w-full h-[40%] min-h-[190px] max-h-[260px] bg-surface-inset shrink-0 border-b border-border overflow-hidden">
            <div ref={mapContainerRef} className="w-full h-full z-10" />

            {/* GPS Recenter Floating Button */}
            <button
              type="button"
              onClick={handleRecenterGPS}
              disabled={gpsLoading}
              className="absolute bottom-3 right-3 z-30 p-2.5 rounded-full bg-white text-zinc-900 shadow-xl border border-zinc-200 hover:bg-zinc-100 active:scale-90 transition cursor-pointer flex items-center justify-center"
              title="Locate My Position"
            >
              {gpsLoading ? (
                <Loader2 className="w-4 h-4 text-rose-600 animate-spin" />
              ) : (
                <Crosshair className="w-4 h-4 text-rose-600" />
              )}
            </button>

            {/* Map Drag Helper Overlay */}
            <div className="absolute top-2.5 left-3 z-30 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md text-[10px] font-semibold text-white shadow pointer-events-none flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
              <span>Drag map or pin to adjust</span>
            </div>
          </div>

          {/* NEARBY PLACES / SEARCH RESULTS LIST (INSTAGRAM UX) */}
          <div className="flex-1 flex flex-col min-h-0 bg-surface overflow-hidden">
            <div className="px-4 pt-3 pb-1.5 flex items-center justify-between shrink-0">
              <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                {searchQuery.trim() ? (
                  <>
                    <Search className="w-3.5 h-3.5 text-rose-500" />
                    <span>Search Results</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-3.5 h-3.5 text-rose-500" />
                    <span>Places Near You</span>
                  </>
                )}
              </span>

              {searching && <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />}
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1 hide-scrollbar">
              {searching && placesList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-text-muted space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                  <span className="text-xs font-bold">Discovering places...</span>
                </div>
              ) : placesList.length === 0 ? (
                <div className="text-center py-12 text-text-muted text-xs space-y-1">
                  <MapPin className="w-6 h-6 mx-auto text-text-muted opacity-60 mb-1" />
                  <p className="font-semibold">No places found</p>
                  <p className="text-[11px]">Try moving the map or searching a specific spot.</p>
                </div>
              ) : (
                placesList.map((place, idx) => {
                  const isSelected =
                    selectedPlace.title === place.title ||
                    selectedPlace.name === place.name;

                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelectPlaceItem(place)}
                      onDoubleClick={() => handleConfirm(place)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-2xl cursor-pointer transition border ${
                        isSelected
                          ? "bg-rose-500/15 border-rose-500/40 text-text shadow-sm"
                          : "bg-surface hover:bg-surface-inset border-transparent hover:border-border text-text-secondary hover:text-text"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                              : "bg-surface-inset border border-border text-rose-500"
                          }`}
                        >
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="truncate flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-text truncate">
                            {place.title || place.name}
                          </p>
                          {place.subtitle && (
                            <p className="text-[11px] text-text-muted truncate">
                              {place.subtitle}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {place.category && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-surface-inset border border-border text-text-muted hidden sm:inline">
                            {place.category}
                          </span>
                        )}
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow">
                            <Check className="w-3 h-3" />
                          </div>
                        ) : (
                          <ChevronRight className="w-4 h-4 text-text-muted" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Selected Place Confirmation CTA */}
            {selectedPlace.title && (
              <div className="p-3 border-t border-border bg-surface-inset flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                  <div className="truncate">
                    <p className="text-xs font-black text-text truncate">{selectedPlace.title}</p>
                    <p className="text-[10px] text-text-muted truncate">
                      {selectedPlace.subtitle || "Selected on Map"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleConfirm(selectedPlace)}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:opacity-95 text-white font-black text-xs shadow-lg shadow-rose-500/25 transition active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirm</span>
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default LocationPickerModal;
