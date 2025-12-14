require("dotenv").config();
const Koa = require("koa");
const routes = require("./routes");

const app = new Koa();

app.use(routes.routes()).use(routes.allowedMethods());

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
