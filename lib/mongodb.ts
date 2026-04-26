import { Db, MongoClient } from "mongodb";

const uri = process.env.MONGO_URL;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient> | undefined;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> | null {
  if (!uri) return null;
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri, options);
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  }
  if (!clientPromise) {
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }
  return clientPromise;
}

/** Base MongoDB (optionnelle si `MONGO_URL` est absent). */
export async function getDb(): Promise<Db | null> {
  const promise = getClientPromise();
  if (!promise) return null;
  const c = await promise;
  return c.db(process.env.DB_NAME || "monican_recharge");
}
