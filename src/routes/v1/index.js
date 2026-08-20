const { Router } = require("express");

const router = Router();

router.use("/auth", require("./auth.routes"));
router.use("/profile", require("./profile.routes"));
router.use("/institutions", require("./institution.routes"));
router.use("/programmes", require("./programme.routes"));
router.use("/admission-sessions", require("./admissionSession.routes"));
router.use("/assessments", require("./assessment.routes"));
router.use("/payments", require("./payment.routes"));
router.use("/compare", require("./compare.routes"));
router.use("/admin", require("./admin"));

module.exports = router;
