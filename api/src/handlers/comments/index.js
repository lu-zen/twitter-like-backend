import validation from "./validation";
import db from "../../utils/db";
import { generateToken, decryptToken } from "../../services/paseto";
import { hash, verifyHash } from "../../services/hash";
import { nanoid } from "nanoid";
import { aql } from "arangojs";

const commentsCollection = db.collection("comments");

export class CommentsHandler {
  static async create(ctx) {
    const { content } = ctx.request.body;
    const { publicationId } = ctx.params;
    const { tokenData } = ctx;

    await validation
      .create({ content, publicationId })
      .catch(async e => ctx.throw(400, e.message));

    const publication = await db
      .collection("publications")
      .firstExample({ uid: publicationId })
      .catch(e => ctx.throw(404, "Can't find a publication with given id."));

    const uid = nanoid();
    const now = new Date().toISOString();
    const { new: newComment } = await commentsCollection.save(
      {
        uid,
        content,
        publication: publication.uid,
        author: tokenData.uid,
        createdAt: now,
        updatedAt: now
      },
      { returnNew: true }
    );

    ctx.body = {
      success: true,
      data: {
        uid: newComment.uid,
        content: newComment.content,
        createdAt: newComment.createdAt,
        updatedAt: newComment.updatedAt
      }
    };
    /*     
    const newUid = nanoid();
    const now = new Date().toISOString();

    const query = await db.query(aql`
    FOR u IN users FILTER u.uid == ${tokenData.uid}
      INSERT {
        uid: ${newUid},
        content: ${reqContent},
        createdAt: ${now},
        updatedAt: ${now},
        author: u.uid
      } INTO publications
      RETURN MERGE({publication: NEW}, { author: u })
    `);

    const { publication, author } = query["_result"][0];

    delete author.password;

    ctx.body = {
      success: true,
      data: {
        uid: publication.uid,
        content: publication.content,
        createdAt: publication.createdAt,
        updatedAt: publication.updatedAt,
        author: {
          uid: author.uid,
          name: author.name
        }
      }
    }; */
  }

  static async get(ctx) {
    const { id: requestedId } = ctx.params;
    const { offset, limit } = ctx.request.body;

    if (!requestedId) {
      if (typeof offset !== "number")
        ctx.throw(400, "`offset` should be a number");
    }

    // Specific publication
    if (requestedId) {
      const query = await db.query(aql`
        FOR p IN publications FILTER p.uid == ${requestedId}
          FOR u IN users FILTER u.uid == p.author
        RETURN MERGE(p, { author: MERGE(u, { password: null }) })
      `);

      const result = query["_result"];

      if (!result.length) {
        ctx.throw(404);
      }

      const { uid, content, author, createdAt, updatedAt } = result[0];

      ctx.body = {
        success: true,
        data: {
          uid,
          content,
          author: {
            uid: author.uid,
            name: author.name,
            createdAt: author.createdAt,
            updatedAt: author.updatedAt
          },
          createdAt,
          updatedAt
        }
      };
      return;
    }

    // Multiple publications
    const query = await db.query(
      aql`
      FOR p IN publications
        FOR u IN users FILTER p.author == u.uid
      LIMIT ${offset}, ${limit || 10}
      SORT p.createdAt DESC
      RETURN MERGE(p, { author: MERGE(u, { password: null }) })
    `,
      { batchSize: 100 }
    );
    const total = await publicationsCollection.count();

    ctx.body = {
      success: true,
      data: {
        publications: query["_result"].map(
          ({
            uid,
            content,
            createdAt,
            updatedAt,
            author: {
              uid: aUid,
              name: aName,
              createdAt: aCreatedAt,
              updatedAt: aUpdatedAt
            }
          }) => ({
            uid,
            content,
            createdAt,
            updatedAt,
            author: {
              uid: aUid,
              name: aName,
              createdAt: aCreatedAt,
              updatedAt: aUpdatedAt
            }
          })
        ),
        total: total.count
      }
    };
  }

  static async update(ctx) {
    const { content } = ctx.request.body;
    const id = ctx.params.id;
    const { tokenData } = ctx;

    // Validation
    await validation
      .update({ id, content })
      .catch(async e => ctx.throw(400, e.message));

    const comment = await commentsCollection
      .firstExample({ uid: id })
      .catch(e => ctx.throw(404, "Can't find a comment with given id."));

    if (comment.author !== tokenData.uid) {
      ctx.throw(403, "You can only update your own publications.");
    }

    const now = new Date().toISOString();

    const { new: updatedComment } = await commentsCollection.update(
      { _key: comment._key },
      { content, updatedAt: now },
      { mergeObjects: true, returnNew: true }
    );

    ctx.body = {
      success: true,
      data: {
        uid: updatedComment.uid,
        content: updatedComment.content,
        updatedAt: updatedComment.updatedAt
      }
    };
  }

  static async delete(ctx) {
    const id = ctx.params.id;
    const { tokenData } = ctx;

    await validation.delete({ id }).catch(e => ctx.throw(400, e.message));

    const comment = await commentsCollection
      .firstExample({ uid: id })
      .catch(e => ctx.throw(404, "Can't find a comment with given id."));

    if (comment.author !== tokenData.uid) {
      ctx.throw(403, "You can only delete your own comments.");
    }

    const result = await commentsCollection.removeByExample({ uid: id });

    ctx.body = {
      success: true,
      data: result
    };
  }

  static async getComment(ctx) {}
}
