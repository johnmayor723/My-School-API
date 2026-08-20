const { Router } = require("express");
const admissionSessionController = require("../../controllers/admissionSession.controller");
const { authenticate } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { paginationQuery } = require("../../validators/common.validators");

const router = Router();

router.get("/", authenticate, validate(paginationQuery()), admissionSessionController.list);

module.exports = router;
