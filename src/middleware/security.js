const helmet = require("helmet");
const cors = require("cors");
const mongoSanitize = require("express-mongo-sanitize");
const hpp = require("hpp");
const env = require("../config/env");
const { UnauthorizedError } = require("../errors/AppError");

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true); // same-origin / server-to-server / curl
    if (env.clientUrls.includes(origin)) return callback(null, true);
    return callback(new UnauthorizedError("Origin not allowed by CORS policy"));
  },
  credentials: true,
};

function applySecurity(app) {
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(mongoSanitize());
  app.use(hpp());
}

module.exports = { applySecurity, corsOptions };
