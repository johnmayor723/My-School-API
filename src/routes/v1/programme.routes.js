const { Router } = require("express");
const programmeController = require("../../controllers/programme.controller");
const { validate } = require("../../middleware/validate");
const { mongoIdParam } = require("../../validators/common.validators");
const { listProgrammesQueryValidator, searchProgrammesQueryValidator } = require("../../validators/programme.validators");

const router = Router();

router.get("/", validate(listProgrammesQueryValidator), programmeController.list);
router.get("/search", validate(searchProgrammesQueryValidator), programmeController.search);
router.get("/:id", validate([mongoIdParam()]), programmeController.getById);

module.exports = router;
