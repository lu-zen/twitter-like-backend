import KoaRouter from "koa-router";
import { UserHandlers } from "./handlers/users";
import { PublicationsHandler } from "./handlers/publications";
import { authRequired } from "./middlewares/authRequired";
import { CommentsHandler } from "./handlers/comments";

const router = new KoaRouter();

// Users
router.post("/users/auth", UserHandlers.auth);
router.get("/users/:id", UserHandlers.get);
router.post("/users", UserHandlers.register);
router.put("/users/:id", authRequired, UserHandlers.update);
router.delete("/users/:id", authRequired, UserHandlers.delete);

// Publications
router.get("/publications/:id?", PublicationsHandler.get);
router.post("/publications", authRequired, PublicationsHandler.create);
router.put("/publications/:id", authRequired, PublicationsHandler.update);
router.delete("/publications/:id", authRequired, PublicationsHandler.delete);

// Comments
router.put("/comments/:id", authRequired, CommentsHandler.update);
router.delete("/comments/:id", authRequired, CommentsHandler.delete);
router.post("/publications/:publicationId/comments", authRequired, CommentsHandler.create);

export default router;
