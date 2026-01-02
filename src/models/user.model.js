const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    photo: { type: String },

    // first login info 
    primaryProvider: {
      type: String,
      enum: ["google", "facebook", "local"],
      required: true,
      default: "local",
    },
    primaryProviderId: { type: String },

    role: { type: String, enum: ["user", "admin"], default: "user" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);