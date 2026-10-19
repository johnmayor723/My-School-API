const { body, param } = require("express-validator");
const { mongoIdParam, paginationQuery } = require("./common.validators");

const slugParam = () => param("slug").isString().trim().notEmpty().withMessage("slug is required");

const blockValidator = body("blocks")
  .optional()
  .isArray()
  .withMessage("blocks must be an array");

const pageBodyValidator = [
  body("slug").trim().notEmpty().withMessage("slug is required").toLowerCase(),
  body("title").trim().notEmpty().withMessage("title is required"),
  body("subtitle").optional().isString().trim(),
  body("heroImage").optional({ nullable: true, checkFalsy: true }).isURL().withMessage("heroImage must be a valid URL or null"),
  blockValidator,
];

const postBodyValidator = [
  body("slug").trim().notEmpty().withMessage("slug is required").toLowerCase(),
  body("title").trim().notEmpty().withMessage("title is required"),
  body("excerpt").optional().isString().trim(),
  body("featuredImage").optional({ nullable: true, checkFalsy: true }).isURL().withMessage("featuredImage must be a valid URL or null"),
  body("publishedAt").optional().isISO8601().withMessage("publishedAt must be an ISO date"),
  blockValidator,
];

const listPostsQueryValidator = [...paginationQuery()];

const partnerBodyValidator = [
  body("name").trim().notEmpty().withMessage("name is required"),
  body("logo").isURL().withMessage("logo must be a valid URL"),
  body("href").optional().isString().trim(),
  body("order").optional().isInt().toInt(),
];

const PROGRAM_CATEGORIES = ["education", "training", "migration"];

const programBodyValidator = [
  body("category").isIn(PROGRAM_CATEGORIES).withMessage("category must be one of: " + PROGRAM_CATEGORIES.join(", ")),
  body("slug").trim().notEmpty().withMessage("slug is required"),
  body("label").trim().notEmpty().withMessage("label is required"),
  body("href").optional().isString().trim(),
  body("order").optional().isInt().toInt(),
];

const homeContentBodyValidator = [
  body("hero").optional().isObject(),
  body("mission").optional().isObject(),
  body("services").optional().isArray(),
  body("cta").optional().isObject(),
  body("testimonial").optional().isObject(),
];

const contactSubmitValidator = [
  body("name").trim().notEmpty().withMessage("name is required"),
  body("email").isEmail().withMessage("a valid email is required").normalizeEmail(),
  body("phone").optional().isString().trim(),
  body("message").optional().isString().trim().isLength({ max: 5000 }),
];

module.exports = {
  slugParam,
  mongoIdParam,
  pageBodyValidator,
  postBodyValidator,
  listPostsQueryValidator,
  partnerBodyValidator,
  programBodyValidator,
  homeContentBodyValidator,
  contactSubmitValidator,
};
