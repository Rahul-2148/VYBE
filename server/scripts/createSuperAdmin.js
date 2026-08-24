import dotenv from "dotenv";
import mongoose from "mongoose";
import bcryptjs from "bcryptjs";
import { User } from "../models/user.model.js";

dotenv.config();

const ALL_PERMISSIONS = [
  "manage_users",
  "manage_reports",
  "manage_verification",
  "manage_live_streams",
  "system_broadcast",
  "view_financials",
  "manage_staff",
  "view_audit_logs",
];

async function setupSuperAdmin() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/vybe";
  await mongoose.connect(mongoUri);
  console.log("✅ Connected to MongoDB.");

  // Get args — email and password
  const targetEmail = process.argv[2] || "admin@vybe.com";
  const targetPassword = process.argv[3] || "Admin@123456";
  const targetUsername = process.argv[4] || "superadmin";

  console.log("\n📌 Setup Details:");
  console.log(`   Email:    ${targetEmail}`);
  console.log(`   Username: ${targetUsername}`);
  console.log(`   Password: ${targetPassword}\n`);

  // Check if user already exists
  let user = await User.findOne({
    $or: [{ email: targetEmail.toLowerCase() }, { userName: targetUsername.toLowerCase() }],
  });

  if (user) {
    // Promote existing user to superadmin
    user.role = "superadmin";
    user.adminPermissions = ALL_PERMISSIONS;
    user.isVerified = true;
    user.verificationStatus = "verified";
    await user.save();
    console.log(`👑 Existing user @${user.userName} (${user.email}) has been elevated to SUPER ADMIN!`);
  } else {
    // Create new superadmin account
    const hashedPassword = await bcryptjs.hash(targetPassword, 12);
    user = await User.create({
      name: "Vybe Super Admin",
      userName: targetUsername.toLowerCase(),
      email: targetEmail.toLowerCase(),
      password: hashedPassword,
      role: "superadmin",
      adminPermissions: ALL_PERMISSIONS,
      isVerified: true,
      verificationStatus: "verified",
      bio: "Official Vybe Platform Super Administrator",
    });
    console.log(`👑 Super Admin account created successfully!`);
  }

  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║           SUPER ADMIN LOGIN INFO             ║");
  console.log("╠══════════════════════════════════════════════╣");
  console.log(`║  Email:     ${user.email.padEnd(32)}║`);
  console.log(`║  Username:  @${user.userName.padEnd(31)}║`);
  console.log(`║  Password:  ${targetPassword.padEnd(32)}║`);
  console.log(`║  Role:      Super Admin                      ║`);
  console.log("╠══════════════════════════════════════════════╣");
  console.log("║                                              ║");
  console.log("║  1. Start the server:  npm run dev            ║");
  console.log("║  2. Start admin panel: npm run dev:admin      ║");
  console.log("║  3. Open: http://localhost:5174               ║");
  console.log("║  4. Select 'Super Admin' role + login         ║");
  console.log("║  5. Go to Staff → Register New Staff          ║");
  console.log("║     to create Admin/Moderator/Support/Finance ║");
  console.log("║                                              ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  await mongoose.disconnect();
  console.log("Done. Database disconnected.");
}

setupSuperAdmin().catch((err) => {
  console.error("❌ Error setting up super admin:", err);
  process.exit(1);
});
