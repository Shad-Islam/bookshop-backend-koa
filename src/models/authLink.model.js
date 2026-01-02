const mongoose = require("mongoose");

const authLinkSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // 1 auth link doc per user
      index: true,
    },

    accounts: {
      google: {
        providerId: { type: String, index: true },
        email: { type: String, trim: true, lowercase: true },
        photo: { type: String },
        linkedAt: { type: Date },
      },
      facebook: {
        providerId: { type: String, index: true },
        email: { type: String, trim: true, lowercase: true },
        photo: { type: String },
        linkedAt: { type: Date },
      },
      local: {
        email: { type: String, trim: true, lowercase: true },
        passwordHash: { type: String },
        linkedAt: { type: Date },
      },
    },
  },
  { timestamps: true }
);

// Uniqueness across all users 
authLinkSchema.index(
  { "accounts.google.providerId": 1 },
  { unique: true, sparse: true }
);

authLinkSchema.index(
  { "accounts.facebook.providerId": 1 },
  { unique: true, sparse: true }
);

// Optional: prevent two users having same local email 
authLinkSchema.index(
  { "accounts.local.email": 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.model("AuthLink", authLinkSchema);
