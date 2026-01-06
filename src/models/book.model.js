const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },

    // Optional (because your route allows author to be null)
    author: { type: String, trim: true },

    description: { type: String, trim: true },

    // Store relative path (best for Docker + portability)
    pdfPath: { type: String, required: true, trim: true },

    // Optional cover image path (relative)
    coverPath: { type: String, trim: true },

    // Optional tags
    tags: [{ type: String, trim: true }],

    // Soft hide/show
    isActive: { type: Boolean, default: true },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

bookSchema.index({ title: 1 });

module.exports = mongoose.model("Book", bookSchema);
