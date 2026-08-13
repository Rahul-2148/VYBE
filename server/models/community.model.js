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
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    image: {
      url: { type: String, default: "" },
      public_id: { type: String, default: "" },
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
    },
    inviteCode: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  { timestamps: true }
);

communitySchema.index({ inviteCode: 1 });
communitySchema.index({ "members.user": 1 });

export const Community = mongoose.model("Community", communitySchema);
