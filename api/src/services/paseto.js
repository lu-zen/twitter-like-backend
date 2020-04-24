import { createSecretKey } from "crypto";
import { V2 } from "paseto";

export const generateToken = async payload => {
  if (!payload) {
    throw Error("missing token payload");
  }

  const key = Buffer.from(
    process.env.KEY_SECRET,
    "base64"
  );

  return await V2.encrypt(payload, key, { expiresIn: "1 hour" });
};

export const decryptToken = async token => {
  const key = createSecretKey(Buffer.from(process.env.KEY_SECRET, "base64"));

  return await V2.decrypt(token, key);
};
