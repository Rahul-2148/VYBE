// scripts/testSystemIntegrity.js - Live MongoDB connectivity smoke check.
// This is intentionally not labeled an E2E suite: it does not exercise user flows.
import "dotenv/config";
import mongoose from "mongoose";

const main = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error("[FAIL] Database connectivity: MONGODB_URI is not configured.");
    process.exitCode = 1;
    return;
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });

    const ping = await mongoose.connection.db.admin().ping();
    if (ping?.ok !== 1) {
      throw new Error("MongoDB ping did not return ok: 1");
    }

    console.log("[PASS] Database connectivity: MongoDB connection and admin ping succeeded.");
    console.log(`Database: ${mongoose.connection.name}`);
    console.log(
      "Scope: this smoke check does not validate authentication, CRUD, sockets, uploads, privacy rules, or browser UI."
    );
  } catch (error) {
    console.error("[FAIL] Database connectivity:", error.message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect().catch(() => {});
    }
  }
};

main().catch((error) => {
  console.error("[FAIL] Unexpected smoke-check error:", error.message);
  process.exitCode = 1;
});
