const { body } = require("express-validator");

const sendChatMessageValidator = [
  body("message").isString().trim().notEmpty().isLength({ max: 1000 }).withMessage("message must be 1-1000 characters"),
];

module.exports = { sendChatMessageValidator };
