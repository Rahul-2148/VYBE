// services/redis.service.js - Enterprise-Grade Resilient Redis Client with Transparent In-Memory/Database Fallback
import Redis from "ioredis";

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.fallbackMap = new Map();
    this.init();
  }

  init() {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      console.log("ℹ️ Redis Service: No REDIS_URL configured. Running with high-performance In-Memory Fallback.");
      return;
    }

    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 2,
        connectTimeout: 5000,
        enableOfflineQueue: false,
        retryStrategy: (times) => {
          if (times > 3) {
            console.warn("⚠️ Redis Service: Max reconnection attempts reached. Continuing with In-Memory fallback.");
            return null; // Stop retrying to avoid blocking
          }
          return Math.min(times * 1000, 3000);
        },
      });

      this.client.on("connect", () => {
        this.isConnected = true;
        console.log("✅ Redis Service: Connected to Redis server successfully.");
      });

      this.client.on("ready", () => {
        this.isConnected = true;
      });

      this.client.on("error", (err) => {
        this.isConnected = false;
        // Suppress unhandled error crashes, log warning
        console.warn(`⚠️ Redis Service Connection Warning: ${err.message || "Redis unavailable"}. Using In-Memory fallback.`);
      });

      this.client.on("close", () => {
        this.isConnected = false;
      });
    } catch (err) {
      console.warn("⚠️ Redis Service Initialization Error:", err.message);
      this.isConnected = false;
    }
  }

  // --- GENERAL KEY-VALUE OPERATIONS ---

  async get(key) {
    if (this.isConnected && this.client) {
      try {
        const val = await this.client.get(key);
        if (val) return JSON.parse(val);
      } catch (err) {
        console.warn(`Redis get fallback for key "${key}":`, err.message);
      }
    }

    // In-memory fallback
    const item = this.fallbackMap.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.fallbackMap.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key, value, ttlSeconds = 300) {
    if (this.isConnected && this.client) {
      try {
        await this.client.set(key, JSON.stringify(value), "EX", ttlSeconds);
        return true;
      } catch (err) {
        console.warn(`Redis set fallback for key "${key}":`, err.message);
      }
    }

    // In-memory fallback
    this.fallbackMap.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    return true;
  }

  async del(key) {
    if (this.isConnected && this.client) {
      try {
        await this.client.del(key);
      } catch (err) {
        console.warn(`Redis del fallback for key "${key}":`, err.message);
      }
    }
    this.fallbackMap.delete(key);
    return true;
  }

  // --- HIGH-SPEED OTP & AUTH HELPERS (With Resilient Fallback) ---

  async storeOtp(emailOrPhone, otp, ttlSeconds = 900) {
    const key = `otp:${emailOrPhone.toLowerCase().trim()}`;
    return await this.set(key, { otp: String(otp), createdAt: Date.now() }, ttlSeconds);
  }

  async verifyOtp(emailOrPhone, otp) {
    const key = `otp:${emailOrPhone.toLowerCase().trim()}`;
    const data = await this.get(key);
    if (!data) return false;

    if (String(data.otp) === String(otp)) {
      await this.del(key); // Invalidate once consumed
      return true;
    }
    return false;
  }

  async isHealthy() {
    if (!this.isConnected || !this.client) return false;
    try {
      const ping = await this.client.ping();
      return ping === "PONG";
    } catch {
      return false;
    }
  }
}

export const redisService = new RedisService();
