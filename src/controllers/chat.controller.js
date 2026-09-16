const chatService = require("../modules/ai-chat/chatService");
const { sendSuccess } = require("../responses/ApiResponse");

async function sendMessage(req, res) {
  const { userMessage, assistantMessage } = await chatService.sendMessage(req.params.id, req.user, req.body.message);
  sendSuccess(res, { statusCode: 201, data: { userMessage, assistantMessage } });
}

async function listMessages(req, res) {
  const messages = await chatService.listMessages(req.params.id, req.user);
  sendSuccess(res, { data: messages });
}

module.exports = { sendMessage, listMessages };
