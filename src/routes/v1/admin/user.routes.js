const { Router } = require("express");
const userController = require("../../../controllers/admin/user.controller");
const { authenticate } = require("../../../middleware/auth");
const { permit } = require("../../../middleware/permit");
const { validate } = require("../../../middleware/validate");
const { mongoIdParam } = require("../../../validators/common.validators");
const { createUserValidator, updateUserValidator, listUsersQueryValidator } = require("../../../validators/user.validators");
const { PERMISSIONS } = require("../../../config/constants");

const router = Router();

// Broad "can reach this resource" gate — the precise staff-vs-student rule
// (super-admin-only for staff, MANAGE_STUDENTS for students) is enforced
// inside user.service.js, since it depends on the target account's type.
router.use(authenticate, permit(PERMISSIONS.MANAGE_USERS, PERMISSIONS.MANAGE_STUDENTS, PERMISSIONS.VIEW_STUDENTS));
router.get("/", validate(listUsersQueryValidator), userController.list);
router.get("/:id", validate([mongoIdParam()]), userController.getById);
router.post("/", validate(createUserValidator), userController.create);
router.patch("/:id", validate([mongoIdParam(), ...updateUserValidator]), userController.update);
router.delete("/:id", validate([mongoIdParam()]), userController.remove);

module.exports = router;
