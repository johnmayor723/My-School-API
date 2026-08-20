const { Router } = require("express");
const institutionController = require("../../controllers/institution.controller");
const { validate } = require("../../middleware/validate");
const { mongoIdParam } = require("../../validators/common.validators");
const { listInstitutionsQueryValidator } = require("../../validators/institution.validators");

const router = Router();

router.get("/", validate(listInstitutionsQueryValidator), institutionController.list);
router.get("/:id", validate([mongoIdParam()]), institutionController.getById);

module.exports = router;
