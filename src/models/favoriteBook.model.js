const mongoose = require("mongoose");

const favoriteBookSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
        required: true,
        index: true,
    },
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Ensure a user can't favorite the same book multiple times
favoriteBookSchema.index({ userId: 1, bookId: 1 }, { unique: true });

module.exports = mongoose.model("FavoriteBook", favoriteBookSchema);