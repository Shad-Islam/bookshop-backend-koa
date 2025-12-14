const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true, index: true },

  // OAuth fields
  provider: { type: String, enum: ["google", "facebook"], required: true },
  providerId: { type: String, required: true },

  role: { type: String, enum: ["user", "admin"], default: "user" },
}, 
{ timestamps: true });

userSchema.index({provider: 1, providerId: 1}, {unique: true});

module.exports =mongoose.model("User", userSchema);

