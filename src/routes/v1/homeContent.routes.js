const { Router } = require("express");
const homeContentController = require("../../controllers/homeContent.controller");

const router = Router();

router.get("/", homeContentController.get);

module.exports = router;
