require("express-async-errors");
const express = require("express");
const { applySecurity } = require("./middleware/security");
const { generalLimiter } = require("./middleware/rateLimiter");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const env = require("./config/env");
const v1Routes = require("./routes/v1");

const app = express();

applySecurity(app);
app.use(
  express.json({
    limit: "1mb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(generalLimiter);

app.get("/health", (req, res) => res.json({ success: true, status: "ok", time: new Date().toISOString() }));

app.use(env.apiBasePath, v1Routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
