const { Router } = require("express");
const auditLogController = require("../../../controllers/admin/auditLog.controller");
const { authenticate } = require("../../../middleware/auth");
const { permit } = require("../../../middleware/permit");
const { validate } = require("../../../middleware/validate");
const { listAuditLogsQueryValidator } = require("../../../validators/auditLog.validators");
const { PERMISSIONS } = require("../../../config/constants");

const router = Router();

router.use(authenticate, permit(PERMISSIONS.VIEW_AUDIT_LOGS));
router.get("/", validate(listAuditLogsQueryValidator), auditLogController.list);

module.exports = router;
