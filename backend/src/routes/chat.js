const express = require("express");
const router = express.Router();
const aiAgent = require("../services/aiAgent");

router.post("/", async (req, res) => {
  console.log("[Chat] Sending message to AI agent", req.body);
  const { userId, messageText } = req.body;

  if (!userId || !messageText) {
    return res
      .status(400)
      .json({ error: "userId and messageText are required" });
  }

  if (req.io) {
    req.io.emit("new_message", {
      platform: "direct",
      senderId: userId,
      text: messageText,
      role: "user",
    });
  }

  const aiReply = await aiAgent.generateResponse(userId, messageText, "direct");
  console.log("[Chat] AI Agent response:", aiReply);

  if (req.io) {
    req.io.emit("new_message", {
      platform: "direct",
      senderId: userId,
      text: aiReply,
      role: "assistant",
    });
  }

  res.json({ reply: aiReply, userId });
});

module.exports = router;
