import argon2 from "argon2";

export const hash = async (password) => {
  const hash = await argon2.hash(password);
  return hash;
}

export const verifyHash = async (hash, password) => {
  const match = await argon2.verify(hash, password);
  return match;
}