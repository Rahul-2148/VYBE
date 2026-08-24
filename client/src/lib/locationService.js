// client/src/lib/locationService.js
// Universal Location & Geocoding Service for VYBE

// In-memory cache for geocoding queries
const cache = new Map();

/**
 * Curated Popular Global & Local Hotspots for Instant Autocomplete
 */
export const POPULAR_LOCATIONS = [
  { name: "Mumbai, Maharashtra, India", type: "city", category: "City", country: "India", lat: 19.076, lon: 72.8777 },
  { name: "New Delhi, Delhi, India", type: "city", category: "City", country: "India", lat: 28.6139, lon: 77.209 },
  { name: "Bengaluru, Karnataka, India", type: "city", category: "City", country: "India", lat: 12.9716, lon: 77.5946 },
  { name: "Goa, India", type: "beach", category: "Beach", country: "India", lat: 15.2993, lon: 74.124 },
  { name: "New York City, New York, USA", type: "city", category: "City", country: "USA", lat: 40.7128, lon: -74.006 },
  { name: "London, United Kingdom", type: "city", category: "City", country: "UK", lat: 51.5074, lon: -0.1278 },
  { name: "Paris, France", type: "city", category: "City", country: "France", lat: 48.8566, lon: 2.3522 },
  { name: "Dubai, United Arab Emirates", type: "city", category: "City", country: "UAE", lat: 25.2048, lon: 55.2708 },
  { name: "Tokyo, Japan", type: "city", category: "City", country: "Japan", lat: 35.6762, lon: 139.6503 },
  { name: "Sydney, Australia", type: "city", category: "City", country: "Australia", lat: -33.8688, lon: 151.2093 },
  { name: "Taj Mahal, Agra, India", type: "landmark", category: "Landmark", country: "India", lat: 27.1751, lon: 78.0421 },
  { name: "Central Park, New York, USA", type: "park", category: "Park", country: "USA", lat: 40.785091, lon: -73.968285 },
  { name: "Eiffel Tower, Paris, France", type: "landmark", category: "Landmark", country: "France", lat: 48.8584, lon: 2.2945 },
  { name: "Burj Khalifa, Dubai, UAE", type: "landmark", category: "Landmark", country: "UAE", lat: 25.1972, lon: 55.2744 },
  { name: "Times Square, New York, USA", type: "landmark", category: "Landmark", country: "USA", lat: 40.758, lon: -73.9855 },
  { name: "Marine Drive, Mumbai, India", type: "beach", category: "Beach", country: "India", lat: 18.9432, lon: 72.823 },
  { name: "Bandra West, Mumbai, India", type: "suburb", category: "Venue", country: "India", lat: 19.0596, lon: 72.8295 },
  { name: "Hauz Khas Village, New Delhi, India", type: "cafe", category: "Cafe", country: "India", lat: 28.5534, lon: 77.1944 },
  { name: "Connaught Place, New Delhi, India", type: "landmark", category: "Shopping", country: "India", lat: 28.6315, lon: 77.2167 },
  { name: "Koramangala, Bengaluru, India", type: "cafe", category: "Cafe", country: "India", lat: 12.9352, lon: 77.6245 },
  { name: "Indiranagar, Bengaluru, India", type: "cafe", category: "Cafe", country: "India", lat: 12.9784, lon: 77.6408 },
  { name: "Bali, Indonesia", type: "beach", category: "Beach", country: "Indonesia", lat: -8.3405, lon: 115.092 },
  { name: "Santorini, Greece", type: "island", category: "Island", country: "Greece", lat: 36.3932, lon: 25.4615 },
  { name: "Los Angeles, California, USA", type: "city", category: "City", country: "USA", lat: 34.0522, lon: -118.2437 },
  { name: "Singapore", type: "city", category: "City", country: "Singapore", lat: 1.3521, lon: 103.8198 },
  { name: "Seoul, South Korea", type: "city", category: "City", country: "South Korea", lat: 37.5665, lon: 126.978 },
];

/**
 * Format raw address object from OpenStreetMap Nominatim into clean components
 */
export const formatAddress = (address, displayName = "") => {
  if (!address) {
    const parts = displayName.split(",").map((s) => s.trim());
    return {
      title: parts[0] || "Location",
      subtitle: parts.slice(1, 3).join(", ") || "",
      city: parts[1] || "",
      country: parts[parts.length - 1] || "",
      full: displayName,
    };
  }

  const title =
    address.amenity ||
    address.shop ||
    address.tourism ||
    address.historic ||
    address.leisure ||
    address.building ||
    address.road ||
    address.suburb ||
    address.neighbourhood ||
    address.village ||
    address.town ||
    address.city ||
    displayName.split(",")[0] ||
    "Location";

  const city =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county ||
    address.state_district ||
    address.state ||
    "";

  const state = address.state || address.region || "";
  const country = address.country || "";

  const subtitleParts = [address.road, address.suburb, address.neighbourhood, city, state, country]
    .filter(Boolean)
    .filter((part) => part.toLowerCase() !== title.toLowerCase());

  const uniqueSubtitleParts = Array.from(new Set(subtitleParts));
  const subtitle = uniqueSubtitleParts.slice(0, 2).join(", ");

  let category = "Place";
  if (address.amenity === "cafe" || address.amenity === "restaurant" || address.amenity === "fast_food") category = "Cafe / Food";
  else if (address.tourism || address.historic) category = "Landmark";
  else if (address.leisure === "park" || address.natural) category = "Nature / Park";
  else if (address.aeroway || address.railway || address.amenity === "bus_station") category = "Transit";
  else if (address.shop) category = "Shopping";
  else if (address.city || address.town) category = "City";
  else if (address.suburb || address.neighbourhood) category = "Area";

  return {
    title,
    subtitle,
    city,
    state,
    country,
    category,
    full: displayName,
  };
};

/**
 * High-Accuracy Place Search with forward geocoding & fallbacks
 */
export const searchPlaces = async (query, options = {}) => {
  const q = query ? query.trim() : "";
  const limit = options.limit || 8;
  const categoryFilter = options.category;

  if (!q) {
    let list = POPULAR_LOCATIONS;
    if (categoryFilter && categoryFilter !== "all") {
      list = list.filter((p) => p.category.toLowerCase() === categoryFilter.toLowerCase());
    }
    return list.slice(0, limit).map((loc) => ({
      name: loc.name,
      title: loc.name.split(",")[0],
      subtitle: loc.name.split(",").slice(1).join(", ").trim(),
      latitude: loc.lat,
      longitude: loc.lon,
      category: loc.category,
      type: loc.type,
      country: loc.country,
    }));
  }

  const cacheKey = `search_${q.toLowerCase()}_${limit}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  // 1. Local matching
  const localMatches = POPULAR_LOCATIONS.filter((loc) =>
    loc.name.toLowerCase().includes(q.toLowerCase())
  ).map((loc) => ({
    name: loc.name,
    title: loc.name.split(",")[0],
    subtitle: loc.name.split(",").slice(1).join(", ").trim(),
    latitude: loc.lat,
    longitude: loc.lon,
    category: loc.category,
    type: loc.type,
    country: loc.country,
  }));

  // 2. Remote Nominatim Search
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=${limit}&q=${encodeURIComponent(
        q
      )}`,
      {
        headers: {
          "Accept-Language": "en",
        },
      }
    );

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const remoteResults = data.map((item) => {
          const parsed = formatAddress(item.address, item.display_name);
          const fullTitle = `${parsed.title}${parsed.subtitle ? ", " + parsed.subtitle : ""}`;
          return {
            name: fullTitle,
            title: parsed.title,
            subtitle: parsed.subtitle,
            city: parsed.city,
            state: parsed.state,
            country: parsed.country,
            category: parsed.category,
            type: item.type || "place",
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
            boundingBox: item.boundingbox,
          };
        });

        // Merge local and remote uniquely
        const seen = new Set();
        const combined = [];
        for (const item of [...localMatches, ...remoteResults]) {
          const key = `${item.title.toLowerCase()}_${item.latitude.toFixed(2)}`;
          if (!seen.has(key)) {
            seen.add(key);
            combined.push(item);
          }
        }

        const finalResults = combined.slice(0, limit);
        cache.set(cacheKey, finalResults);
        return finalResults;
      }
    }
  } catch (err) {
    console.warn("searchPlaces error:", err);
  }

  // Fallback to local matches or generic item
  if (localMatches.length > 0) {
    return localMatches.slice(0, limit);
  }

  return [
    {
      name: q,
      title: q,
      subtitle: "Custom Location",
      latitude: 20.5937,
      longitude: 78.9629,
      category: "Custom",
      type: "custom",
    },
  ];
};

/**
 * Reverse Geocode Latitude and Longitude to Venue / City
 */
export const reverseGeocode = async (lat, lon) => {
  if (typeof lat !== "number" || typeof lon !== "number") return null;

  const cacheKey = `rev_${lat.toFixed(4)}_${lon.toFixed(4)}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${lat}&lon=${lon}`,
      {
        headers: {
          "Accept-Language": "en",
        },
      }
    );

    if (res.ok) {
      const data = await res.json();
      if (data) {
        const parsed = formatAddress(data.address, data.display_name);
        const result = {
          name: `${parsed.title}${parsed.subtitle ? ", " + parsed.subtitle : ""}`,
          title: parsed.title,
          subtitle: parsed.subtitle,
          city: parsed.city,
          state: parsed.state,
          country: parsed.country,
          category: parsed.category,
          latitude: lat,
          longitude: lon,
          fullAddress: data.display_name,
        };
        cache.set(cacheKey, result);
        return result;
      }
    }
  } catch (err) {
    console.warn("reverseGeocode error:", err);
  }

  const fallback = {
    name: `Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`,
    title: `Point (${lat.toFixed(3)}, ${lon.toFixed(3)})`,
    subtitle: "",
    latitude: lat,
    longitude: lon,
  };
  return fallback;
};

/**
 * Fetch Real Nearby Venues / Places around a specific coordinate (Instagram Style)
 */
export const getNearbyPlaces = async (lat, lon) => {
  if (typeof lat !== "number" || typeof lon !== "number") return [];

  const cacheKey = `nearby_${lat.toFixed(3)}_${lon.toFixed(3)}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    // 1. Center place reverse geocoded
    const centerPlace = await reverseGeocode(lat, lon);

    // 2. Fetch places in ~1.5km bounding box
    const delta = 0.018;
    const viewbox = `${lon - delta},${lat + delta},${lon + delta},${lat - delta}`;
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=12&viewbox=${viewbox}&bounded=1&q=cafe+restaurant+attraction+park+store+hotel+mall`,
      {
        headers: {
          "Accept-Language": "en",
        },
      }
    );

    let nearbyList = [];
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        nearbyList = data.map((item) => {
          const parsed = formatAddress(item.address, item.display_name);
          const fullTitle = `${parsed.title}${parsed.subtitle ? ", " + parsed.subtitle : ""}`;
          return {
            name: fullTitle,
            title: parsed.title,
            subtitle: parsed.subtitle,
            city: parsed.city,
            state: parsed.state,
            country: parsed.country,
            category: parsed.category,
            type: item.type || "place",
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
          };
        });
      }
    }

    const combined = [];
    if (centerPlace && centerPlace.title) {
      combined.push({
        ...centerPlace,
        isCurrentPin: true,
      });
    }

    const seen = new Set();
    if (centerPlace?.title) seen.add(centerPlace.title.toLowerCase());

    for (const p of nearbyList) {
      const key = p.title.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(p);
      }
    }

    const result = combined.slice(0, 10);
    cache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn("getNearbyPlaces error:", err);
    const centerPlace = await reverseGeocode(lat, lon);
    return centerPlace ? [centerPlace] : [];
  }
};

/**
 * Get device GPS coordinates with Promises & timeout handling
 */
export const getCurrentGPSLocation = (options = {}) => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error("Geolocation is not supported by your browser."));
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: options.timeout || 10000,
        maximumAge: options.maximumAge || 60000,
      }
    );
  });
};

/**
 * Generate Google Maps & Apple Maps navigation / directions links
 */
export const getDirectionsUrl = (lat, lon, placeName = "") => {
  const isIOS =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent || "");

  if (isIOS) {
    return `https://maps.apple.com/?q=${encodeURIComponent(placeName)}&ll=${lat},${lon}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
};

export default {
  searchPlaces,
  reverseGeocode,
  getNearbyPlaces,
  getCurrentGPSLocation,
  getDirectionsUrl,
  formatAddress,
  POPULAR_LOCATIONS,
};
