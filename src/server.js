require("dotenv").config();

const Koa = require("koa");
const bodyParser = require("koa-bodyparser");
const koaSession = require("koa-session");
const session = koaSession.default || koaSession;
const passport = require("koa-passport");

const routes = require("./routes");
const { ensureIndexes } = require("./config/indexes");
const { connectToDatabase, closeDatabase } = require("./config/db");

require("./config/passport");

const app = new Koa();

app.keys = (process.env.SESSION_KEYS || "dev").split(" ");

app.use(session({}, app));
app.use(passport.initialize());
app.use(passport.session());

app.use(bodyParser());
app.use(routes.routes()).use(routes.allowedMethods());

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    await connectToDatabase();
    await ensureIndexes();

    const server = app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });

    const shutdown = async () => {
      console.log("Shutting down server...");
      server.close(async () => {
        try {
          await closeDatabase();
        } catch (e) {
          console.error("Failed to close DB:", e);
        }
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

app.on("error", (err, ctx) => {
  console.error("Server error", err, ctx);
});
