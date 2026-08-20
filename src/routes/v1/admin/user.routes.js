const { Router } = require("express");
const userController = require("../../../controllers/admin/user.controller");
const { authenticate } = require("../../../middleware/auth");
const { permit } = require("../../../middleware/permit");
const { validate } = require("../../../middleware/validate");
const { mongoIdParam } = require("../../../validators/common.validators");
const {
  createStaffUserValidator,
  updateStaffUserValidator,
  listUsersQueryValidator,
} = require("../../../validators/user.validators");
const { PERMISSIONS } = require("../../../config/constants");

const router = Router();

router.use(authenticate, permit(PERMISSIONS.MANAGE_USERS, PERMISSIONS.VIEW_STUDENTS));
router.get("/", validate(listUsersQueryValidator), userController.list);
router.get("/:id", validate([mongoIdParam()]), userController.getById);
router.post("/", permit(PERMISSIONS.MANAGE_USERS), validate(createStaffUserValidator), userController.createStaffUser);
router.patch(
  "/:id",
  permit(PERMISSIONS.MANAGE_USERS),
  validate([mongoIdParam(), ...updateStaffUserValidator]),
  userController.updateStaffUser
);

module.exports = router;
