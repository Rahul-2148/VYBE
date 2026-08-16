import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";

dotenv.config({ path: path.resolve(process.cwd(), "server/.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function migrate() {
  try {
    const uri = process.env.MONGODB_URI;
    console.log("Connecting to MongoDB:", uri ? "URI Found" : "Missing URI");
    await mongoose.connect(uri);
    const db = mongoose.connection.db;

    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);
    console.log("Existing collections in DB:", collectionNames);

    const hasLoops = collectionNames.includes("loops");
    const hasReels = collectionNames.includes("reels");

    console.log(`hasLoops: ${hasLoops}, hasReels: ${hasReels}`);

    let migratedReelsCount = 0;

    if (hasLoops) {
      const loopsColl = db.collection("loops");
      const reelsColl = db.collection("reels");

      const loops = await loopsColl.find({}).toArray();
      console.log(`Found ${loops.length} documents in 'loops' collection.`);

      for (const loopDoc of loops) {
        // Check if already in reels
        const existing = await reelsColl.findOne({ _id: loopDoc._id });
        if (!existing) {
          const reelDoc = { ...loopDoc };
          // ensure schema compatibility
          if (!reelDoc.reports) reelDoc.reports = [];
          if (!reelDoc.hiddenBy) reelDoc.hiddenBy = [];
          if (reelDoc.commentsDisabled === undefined) reelDoc.commentsDisabled = false;

          await reelsColl.insertOne(reelDoc);
          migratedReelsCount++;
        } else {
          console.log(`Reel ${loopDoc._id} already exists in 'reels' collection.`);
        }
      }
      console.log(`✅ Successfully migrated ${migratedReelsCount} items from 'loops' -> 'reels'.`);
    } else {
      console.log("No 'loops' collection found to migrate.");
    }

    // Check users collection for loops vs reels field
    const usersColl = db.collection("users");
    const usersWithLoops = await usersColl.find({ $or: [{ loops: { $exists: true, $ne: [] } }, { savedLoops: { $exists: true, $ne: [] } }] }).toArray();
    console.log(`Found ${usersWithLoops.length} users with loops or savedLoops arrays.`);

    let usersUpdated = 0;
    for (const u of usersWithLoops) {
      const updateDoc = {};
      if (u.loops && u.loops.length > 0) {
        const existingReels = (u.reels || []).map((id) => id.toString());
        const mergedReels = [...(u.reels || [])];
        for (const loopId of u.loops) {
          if (!existingReels.includes(loopId.toString())) {
            mergedReels.push(loopId);
          }
        }
        updateDoc.reels = mergedReels;
      }
      if (u.savedLoops && u.savedLoops.length > 0) {
        const existingSaved = (u.savedReels || []).map((id) => id.toString());
        const mergedSaved = [...(u.savedReels || [])];
        for (const savedId of u.savedLoops) {
          if (!existingSaved.includes(savedId.toString())) {
            mergedSaved.push(savedId);
          }
        }
        updateDoc.savedReels = mergedSaved;
      }

      if (Object.keys(updateDoc).length > 0) {
        await usersColl.updateOne({ _id: u._id }, { $set: updateDoc });
        usersUpdated++;
      }
    }
    console.log(`✅ Successfully updated ${usersUpdated} users with merged reels & savedReels.`);

    // Verify total reels count now
    const finalReelsCount = await db.collection("reels").countDocuments();
    console.log(`🎉 Total active documents in 'reels' collection: ${finalReelsCount}`);

    process.exit(0);
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

migrate();
