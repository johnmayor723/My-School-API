const { Router } = require("express");
const programController = require("../../controllers/program.controller");
const { query } = require("express-validator");
const { validate } = require("../../middleware/validate");

const router = Router();

router.get(
  "/",
  validate([query("category").optional().isIn(["education", "training", "migration"])]),
  programController.list
);

module.exports = router;
