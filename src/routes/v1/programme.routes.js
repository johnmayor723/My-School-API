const { Router } = require("express");
const { query } = require("express-validator");
const programmeController = require("../../controllers/programme.controller");
const { validate } = require("../../middleware/validate");
const { mongoIdParam } = require("../../validators/common.validators");
const { listProgrammesQueryValidator } = require("../../validators/programme.validators");

const router = Router();

router.get("/", validate(listProgrammesQueryValidator), programmeController.list);
router.get(
  "/search",
  validate([query("q").optional().isString().trim(), query("limit").optional().isInt({ min: 1, max: 50 }).toInt()]),
  programmeController.search
);
router.get("/:id", validate([mongoIdParam()]), programmeController.getById);

module.exports = router;
