import validation from "./validation";
import db from "../../utils/db";
import { nanoid } from "nanoid";
import { aql } from "arangojs";

const publicationsCollection = db.collection("publications");

export class PublicationsHandler {
  static async create(ctx) {
    const { content: reqContent } = ctx.request.body;
    const { tokenData } = ctx;

    await validation
      .create({ content: reqContent })
      .catch(async e => ctx.throw(400, e.message));

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
    };
  }

  static async get(ctx) {
    const { id: requestedId } = ctx.params;
    const { offset, limit } = ctx.request.body;

    if (!requestedId) {
      if (typeof offset !== "number")
        ctx.throw(400, "`offset` should be a number");
    }

    // Single publication
    if (requestedId) {
      const publicationsQuery = await db.query(aql`
        FOR p IN publications FILTER p.uid == ${requestedId}
          FOR u IN users FILTER u.uid == p.author
        RETURN MERGE(p, { author: u })
      `);

      const publicationResult = publicationsQuery["_result"];

      if (!publicationResult.length) {
        ctx.throw(404);
      }

      const {
        uid,
        content,
        author,
        createdAt,
        updatedAt
      } = publicationResult[0];

      const commentsQuery = await db.query(aql`
        FOR c IN comments FILTER c.publication == ${uid} SORT c.createdAt DESC
          FOR u IN users FILTER u.uid == c.author
        RETURN MERGE(c, { author: u })
      `);

      const commentsResult = commentsQuery["_result"].map(
        ({
          uid,
          content,
          createdAt,
          updatedAt,
          author: {
            uid: author_uid,
            name: author_name,
            createdAt: author_createdAt,
            updatedAt: author_updatedAt
          }
        }) => ({
          uid,
          content,
          createdAt,
          updatedAt,
          author: {
            uid: author_uid,
            name: author_name,
            createdAt: author_createdAt,
            updatedAt: author_updatedAt
          }
        })
      );

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
          comments: commentsResult,
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

    const publication = await publicationsCollection
      .firstExample({ uid: id })
      .catch(e => ctx.throw(404, "Can't find a publication with given id."));

    if (publication.author !== tokenData.uid) {
      ctx.throw(403, "You can only update your own publications.");
    }

    const now = new Date().toISOString();

    const { new: updatedPublication } = await publicationsCollection.update(
      { _key: publication._key },
      { content, updatedAt: now },
      { mergeObjects: true, returnNew: true }
    );

    ctx.body = {
      success: true,
      data: {
        uid: updatedPublication.uid,
        content: updatedPublication.content,
        updatedAt: updatedPublication.updatedAt
      }
    };
  }

  static async delete(ctx) {
    const id = ctx.params.id;
    const { tokenData } = ctx;

    await validation.delete({ id }).catch(e => ctx.throw(400, e.message));

    const publication = await publicationsCollection
      .firstExample({ uid: id })
      .catch(e => ctx.throw(404, "Can't find a publication with given id."));

    if (publication.author !== tokenData.uid) {
      ctx.throw(403, "You can only delete your own publications.");
    }

    const result = await publicationsCollection.removeByExample({ uid: id });

    ctx.body = {
      success: true,
      data: result
    };
  }
}
