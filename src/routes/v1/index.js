const { Router } = require("express");

const router = Router();

router.use("/auth", require("./auth.routes"));
router.use("/parent-consent", require("./parentConsent.routes"));
router.use("/profile", require("./profile.routes"));
router.use("/institutions", require("./institution.routes"));
router.use("/programmes", require("./programme.routes"));
router.use("/admission-sessions", require("./admissionSession.routes"));
router.use("/assessments", require("./assessment.routes"));
router.use("/payments", require("./payment.routes"));
router.use("/compare", require("./compare.routes"));
router.use("/scholarships", require("./scholarship.routes"));
router.use("/adviser-enquiries", require("./adviserEnquiry.routes"));
router.use("/pages", require("./page.routes"));
router.use("/posts", require("./post.routes"));
router.use("/partners", require("./partner.routes"));
router.use("/programs", require("./program.routes"));
router.use("/home-content", require("./homeContent.routes"));
router.use("/contact", require("./contact.routes"));
router.use("/admin", require("./admin"));

module.exports = router;
