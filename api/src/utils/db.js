import * as arango from "arangojs";
const { DB_HOST, DB_PORT } = process.env;

const instance = new arango.Database({
  url: `http://${DB_HOST}:${DB_PORT}`,
  maxRetries: 3,
}).useDatabase("twitter");

export default instance;
