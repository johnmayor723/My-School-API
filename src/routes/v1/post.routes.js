const { Router } = require("express");
const postController = require("../../controllers/post.controller");
const { validate } = require("../../middleware/validate");
const { listPostsQueryValidator, slugParam } = require("../../validators/content.validators");

const router = Router();

router.get("/", validate(listPostsQueryValidator), postController.list);
router.get("/:slug", validate([slugParam()]), postController.getBySlug);

module.exports = router;
