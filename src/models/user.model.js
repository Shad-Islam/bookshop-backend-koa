const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },

    // unique+sparse so OAuth users can have null email, but real emails must be unique
    email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },

    // OAuth fields
    provider: {
      type: String,
      enum: ["google", "facebook", "local"],
      default: "local",
    },

    passwordHash: {
      type: String,
      required: function () {
        return this.provider === "local";
      },
    },

    // unique+sparse so multiple nulls are allowed
    googleId: { type: String, unique: true, sparse: true },
    facebookId: { type: String, unique: true, sparse: true },

    role: { type: String, enum: ["user", "admin"], default: "user" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);