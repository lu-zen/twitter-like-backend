import { decryptToken } from "../services/paseto";

export const authRequired = async (ctx, next) => {
  const requestToken = ctx.cookies.get("twitterToken");

  if (!requestToken) {
    ctx.throw(403, "Auth token not found.");
  }

  const tokenData = await decryptToken(requestToken).catch(_e =>
    ctx.throw(403, "Invalid token.")
  );

  ctx.tokenData = tokenData;

  return next()
};
