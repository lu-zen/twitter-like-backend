import appRoutes from "./routes";
import Koa from "koa";
import KoaBodyParser from "koa-bodyparser";
import KoaJson from "koa-json";

const app = new Koa();

// Main middleware
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    /*     if (err.status === 401) {
      ctx.response.status = err.status;
      ctx.response.body = {
        status: err.status,
        error: err.name,
        message: "Access denied. Use a valid token to access."
      };
      return;
    } */
    console.log("**** unhandled err ****\n", err)
    ctx.status = err.status || 500;
    ctx.body = {
      status: err.status || 500,
      error: err.name,
      message:
        process.env.NODE_ENV !== "development" && err.status >= 500
          ? "Internal server error"
          : err.message
    };
  }
});

// Router setup

export default app
  .use(KoaBodyParser())
  .use(appRoutes.routes())
  .use(appRoutes.allowedMethods())
  .use(KoaJson())
  .listen(process.env.PORT || 3000);
