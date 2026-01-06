const jwt = require("jsonwebtoken");

function requireAuth(ctx, next) {
  const authHeader = ctx.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (!token) {
    ctx.status = 401;
    ctx.body = { message: "Authorization token missing" };
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    ctx.state.user = { id: payload.id, role: payload.role };
    return next();
  } catch (err) {
    ctx.status = 401;
    ctx.body = { message: "Invalid or expired token" };
  }
}

module.exports = requireAuth;
