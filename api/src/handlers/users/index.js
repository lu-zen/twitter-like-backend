import validation from "./validation";
import db from "../../utils/db";
import { generateToken } from "../../services/paseto";
import { hash, verifyHash } from "../../services/hash";
import { nanoid } from "nanoid";

const usersCollection = db.collection("users");

export class UserHandlers {
  static async register(ctx) {
    const { name, email, password, repeat_password } = ctx.request.body;

    // Validate user input
    await validation
      .create({ name, email, password, repeat_password })
      .catch(async e => ctx.throw(400, e.message));

    if (repeat_password !== password) {
      ctx.throw(400, "Passwords must be equal.");
    }

    const hashedPassword = await hash(password);

    const existingUser = await usersCollection
      .firstExample({ email })
      .catch(e => null);

    if (existingUser) {
      ctx.throw(403, "There's a user already registered with given email.");
    }

    const uid = nanoid();
    const now = new Date().toISOString();

    await usersCollection.save({
      uid,
      name,
      email,
      password: hashedPassword,
      createdAt: now,
      updatedAt: now
    });

    ctx.body = {
      success: true
    };
  }

  static async get(ctx) {
    const { id: requestedId } = ctx.params;

    await validation
      .get({ id: requestedId })
      .catch(async e => ctx.throw(400, e.message));

    const {
      uid,
      name,
      createdAt,
      updatedAt
    } = await usersCollection
      .firstExample({ uid: requestedId })
      .catch(_e =>
        ctx.throw(404, "Can't retrieve user data or user not found.")
      );

    ctx.body = {
      success: true,
      data: { uid, name, createdAt, updatedAt }
    };
  }

  static async auth(ctx) {
    const { email, password } = ctx.request.body;

    await validation
      .auth({ email, password })
      .catch(async e => ctx.throw(400, e.message));

    const userData = await usersCollection
      .firstExample({ email })
      .catch(_e => ctx.throw(404, "User not found."));

    const isValidHash = await verifyHash(userData.password, password);

    if (!isValidHash) {
      ctx.throw(403, "Invalid password.");
    }

    delete userData.password;

    const token = await generateToken({ uid: userData.uid });

    ctx.cookies.set("twitterToken", token);

    ctx.body = {
      success: true,
      data: {
        uid: userData.uid,
        email: userData.email,
        name: userData.name,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt
      }
    };
  }

  static async update(ctx) {
    const { name, email, password } = ctx.request.body;
    const id = ctx.params.id;
    const { tokenData } = ctx;

    // Validation
    await validation
      .update({ email, password, name, id })
      .catch(async e => ctx.throw(400, e.message));

    if (id !== tokenData.uid) {
      ctx.throw(403, "Can't update another user data.");
    }

    const userData = await usersCollection
      .firstExample({ uid: id })
      .catch(_e => ctx.throw(404, "User not found."));

    const newPassword = password && (await hash(password));

    const newData = {
      ...(email && { email }),
      ...(name && { name }),
      ...(newPassword && { password: newPassword })
    };

    const now = new Date().toISOString();

    const {
      new: { uid, name: newName, email: newEmail, updatedAt, createdAt }
    } = await usersCollection.update(
      { _key: userData._key },
      { ...newData, updatedAt: now },
      {
        mergeObjects: true,
        returnNew: true
      }
    );

    ctx.body = {
      success: true,
      data: {
        uid,
        name: newName,
        email: newEmail,
        createdAt,
        updatedAt
      }
    };
  }

  static async delete(ctx) {
    const id = ctx.params.id;
    const { tokenData } = ctx;

    await validation.delete({ id }).catch(e => ctx.throw(400, e.message));

    if (id !== tokenData.uid) {
      ctx.throw(403, "Can't delete other user.");
    }

    await usersCollection.removeByExample({ uid: tokenData.uid }, { limit: 1 });

    ctx.body = { success: true };
  }
}
