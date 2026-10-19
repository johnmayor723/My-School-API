// One-time (safely re-runnable) migration: copies MACL's marketing/CMS content
// out of michelleandanthony-api's own Mongo (the real, currently-curated data)
// into My School Placement's own collections, so MSP stops depending on that
// other app/DB for this content. Images stay exactly as they are today
// (external WordPress-hosted URLs) -- nothing is re-hosted here.
require("dotenv").config();
const { connectDb, disconnectDb, mongoose } = require("../src/config/db");
const { Page, BlogPost, Partner, Program, HomeContent } = require("../src/models");
const logger = require("../src/config/logger");

const SOURCE_URI = process.env.MACL_SOURCE_MONGODB_URI || "mongodb://127.0.0.1:27120/michelleandanthony";

async function migrateCollection({ sourceConn, collectionName, Model, buildFilter }) {
  const docs = await sourceConn.collection(collectionName).find({}).toArray();
  let count = 0;
  for (const doc of docs) {
    const { _id, __v, ...rest } = doc;
    await Model.findOneAndUpdate(buildFilter(rest), { $set: rest }, { upsert: true, new: true, setDefaultsOnInsert: true });
    count += 1;
  }
  logger.info(`Migrated ${count} document(s) from "${collectionName}"`);
  return count;
}

async function migrateHomeContent(sourceConn) {
  const doc = await sourceConn.collection("homecontents").findOne({});
  if (!doc) {
    logger.warn('No "homecontents" document found at source -- skipping');
    return 0;
  }
  const { _id, __v, ...rest } = doc;
  await HomeContent.findOneAndUpdate({}, { $set: rest }, { upsert: true, new: true, setDefaultsOnInsert: true });
  logger.info("Migrated the HomeContent singleton");
  return 1;
}

async function run() {
  await connectDb();
  const sourceConn = mongoose.createConnection(SOURCE_URI);
  await sourceConn.asPromise();

  try {
    const results = {
      pages: await migrateCollection({ sourceConn, collectionName: "pages", Model: Page, buildFilter: (d) => ({ slug: d.slug }) }),
      blogposts: await migrateCollection({ sourceConn, collectionName: "blogposts", Model: BlogPost, buildFilter: (d) => ({ slug: d.slug }) }),
      partners: await migrateCollection({ sourceConn, collectionName: "partners", Model: Partner, buildFilter: (d) => ({ name: d.name }) }),
      programs: await migrateCollection({
        sourceConn,
        collectionName: "programs",
        Model: Program,
        buildFilter: (d) => ({ category: d.category, slug: d.slug }),
      }),
      homecontents: await migrateHomeContent(sourceConn),
    };
    logger.info("Migration complete", results);
  } finally {
    await sourceConn.close();
    await disconnectDb();
  }
}

run().catch((err) => {
  logger.error("Migration failed", { error: err.message, stack: err.stack });
  process.exitCode = 1;
});
