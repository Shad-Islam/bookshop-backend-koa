require("dotenv").config();
const Koa = require("koa");
const routes = require("./routes");
const connectDb = require("./config/db");

const app = new Koa();

app.use(routes.routes()).use(routes.allowedMethods());

const PORT = process.env.PORT || 4000;

(async () => {
  try {
    await connectDb();
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
})();
