const { Router } = require("express");
const postController = require("../../../controllers/admin/post.controller");
const { authenticate, requireStaff } = require("../../../middleware/auth");
const { permit } = require("../../../middleware/permit");
const { validate } = require("../../../middleware/validate");
const { mongoIdParam, postBodyValidator, listPostsQueryValidator } = require("../../../validators/content.validators");
const { PERMISSIONS } = require("../../../config/constants");

const router = Router();

router.use(authenticate, requireStaff);

router.get("/", validate(listPostsQueryValidator), postController.list);
router.get("/:id", validate([mongoIdParam()]), postController.getById);
router.post("/", permit(PERMISSIONS.MANAGE_CONTENT), validate(postBodyValidator), postController.create);
router.patch("/:id", permit(PERMISSIONS.MANAGE_CONTENT), validate([mongoIdParam(), ...postBodyValidator]), postController.update);
router.delete("/:id", permit(PERMISSIONS.MANAGE_CONTENT), validate([mongoIdParam()]), postController.remove);

module.exports = router;
