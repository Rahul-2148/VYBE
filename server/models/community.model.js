import mongoose from "mongoose";

const communitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      default: "",
      maxlength: 500,
    },
    category: {
      type: String,
      enum: ["Gaming", "Technology", "Music", "Education", "Entertainment", "Creator", "General"],
      default: "General",
      index: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    image: {
      url: { type: String, default: "" },
      public_id: { type: String, default: "" },
    },
    icon: {
      url: { type: String, default: "" },
      public_id: { type: String, default: "" },
    },
    banner: {
      url: { type: String, default: "" },
      public_id: { type: String, default: "" },
    },
    welcomeMessage: {
      type: String,
      default: "Welcome to the community! Feel free to introduce yourself.",
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        roles: {
          type: [String],
          default: ["member"],
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    roles: [
      {
        name: { type: String, required: true },
        permissions: {
          type: [String],
          enum: [
            "manage_channels",
            "manage_roles",
            "kick_members",
            "mute_members",
            "speak",
            "stream",
            "send_messages",
          ],
          default: ["speak", "send_messages"],
        },
      },
    ],
    isPrivate: {
      type: Boolean,
      default: false,
      index: true,
    },
    inviteCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    memberCount: {
      type: Number,
      default: 1,
      index: true,
    },
  },
  { timestamps: true }
);

communitySchema.index({ "members.user": 1 });
communitySchema.index({ name: "text", description: "text", tags: "text" });

export const Community = mongoose.model("Community", communitySchema);
