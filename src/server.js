require("dotenv").config();

const Koa = require("koa");
const bodyParser = require("koa-bodyparser");
const koaSession = require("koa-session");
const session = koaSession.default || koaSession;
const passport = require("koa-passport");

const routes = require("./routes");
const connectDb = require("./config/db");

require("./config/passport");

const app = new Koa();

app.keys = (process.env.SESSION_KEYS || "dev").split(" ");

app.use(session({}, app));
app.use(passport.initialize());
app.use(passport.session());

app.use(bodyParser());
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
