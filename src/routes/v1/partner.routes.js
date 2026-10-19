const { Router } = require("express");
const partnerController = require("../../controllers/partner.controller");

const router = Router();

router.get("/", partnerController.list);

module.exports = router;
