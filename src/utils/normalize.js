function normalizeEmail(email) {
  if (!email) return null;
  return String(email).toLowerCase().trim();
}

function parseTags(tags) {
  if (Array.isArray(tags))
    return tags.map((t) => String(t).trim()).filter(Boolean);
  if (typeof tags === "string" && tags.length) {
    return tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

module.exports = { normalizeEmail, parseTags };
