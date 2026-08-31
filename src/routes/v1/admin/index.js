const { Router } = require("express");

const router = Router();

router.use("/institutions", require("./institution.routes"));
router.use("/programmes", require("./programme.routes"));
router.use("/admission-sessions", require("./admissionSession.routes"));
router.use("/admission-rules", require("./admissionRule.routes"));
router.use("/course-tier-cutoffs", require("./courseTierCutoff.routes"));
router.use("/roles", require("./role.routes"));
router.use("/users", require("./user.routes"));
router.use("/assessments", require("./assessment.routes"));
router.use("/payments", require("./payment.routes"));
router.use("/audit-logs", require("./auditLog.routes"));

module.exports = router;
