import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, X, Navigation, ExternalLink } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export const LocationPickerModal = ({ isOpen, onClose, onSendLocation }) => {
  const [locationName, setLocationName] = useState("");
  const [coords, setCoords] = useState({ latitude: 20.5937, longitude: 78.9629 });
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCoords({ latitude, longitude });
          if (mapRef.current) {
            mapRef.current.setView([latitude, longitude], 14);
            if (markerRef.current) {
              markerRef.current.setLatLng([latitude, longitude]);
            }
          }
          reverseGeocode(latitude, longitude);
        },
        () => {
          reverseGeocode(20.5937, 78.9629);
        }
      );
    } else {
      reverseGeocode(20.5937, 78.9629);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [coords.latitude, coords.longitude],
      zoom: 13,
      zoomControl: false
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    const customIcon = L.divIcon({
      className: "custom-pin",
      html: `<div class="w-8 h-8 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center shadow-lg animate-bounce">
               <div class="w-3.5 h-3.5 rounded-full bg-rose-600 border border-white"></div>
             </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const marker = L.marker([coords.latitude, coords.longitude], {
      icon: customIcon,
      draggable: true
    }).addTo(map);
    markerRef.current = marker;

    marker.on("dragend", () => {
      const latLng = marker.getLatLng();
      setCoords({ latitude: latLng.lat, longitude: latLng.lng });
      reverseGeocode(latLng.lat, latLng.lng);
    });

    map.on("click", (e) => {
      const { lat, lng } = e.latlng;
      setCoords({ latitude: lat, longitude: lng });
      marker.setLatLng([lat, lng]);
      reverseGeocode(lat, lng);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [isOpen]);

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      if (data && data.address) {
        const shortName = data.address.road || data.address.suburb || data.address.city || data.address.town || data.display_name.split(",")[0];
        setLocationName(shortName);
      }
    } catch {}
  };

  const handleShare = () => {
    onSendLocation({
      latitude: coords.latitude,
      longitude: coords.longitude,
      name: locationName.trim() || `Location (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`
    });
    onClose();
  };

  const openGoogleMaps = () => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${coords.latitude},${coords.longitude}`, "_blank");
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-overlay backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md bg-surface border border-border rounded-3xl p-6 text-text shadow-2xl space-y-5"
        >
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center text-text shadow">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Share Location</h3>
                <p className="text-xs text-text-secondary">Drag pin or click map to locate</p>
              </div>
            </div>

            <button onClick={onClose} className="p-2 text-text-secondary hover:text-text rounded-full hover:bg-surface-hover transition cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-border-strong bg-surface-inset">
            <div ref={mapContainerRef} className="w-full h-full z-10" />
            
            <div className="absolute top-2 right-2 z-40">
              <button
                type="button"
                onClick={openGoogleMaps}
                className="flex items-center gap-1 px-2.5 py-1 bg-surface-overlay hover:bg-surface-hover text-[10px] font-bold text-rose-400 rounded-full border border-white/10 shadow transition"
              >
                <span>Verify Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Location Title</label>
              <input
                type="text"
                placeholder="Central Park, Office, New York..."
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className="w-full px-4 py-3 bg-surface-inset border border-border focus:border-rose-500 rounded-xl outline-none text-text text-xs"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={openGoogleMaps}
                className="flex-1 py-3 bg-surface-inset hover:bg-surface border border-border text-text font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Google Maps View</span>
              </button>

              <button
                onClick={handleShare}
                className="flex-1 py-3 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:opacity-95 text-text font-bold rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Send Location Pin</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default LocationPickerModal;
