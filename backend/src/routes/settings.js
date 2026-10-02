const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

router.post("/prompt", (req, res) => {
  const { newPrompt } = req.body;

  if (!newPrompt) {
    return res.status(400).json({ error: "newPrompt field is required" });
  }

  const promptFilePath = path.join(__dirname, "../prompts/systemPrompt.js");
  const fileContent = `module.exports = {
  systemPrompt: \`${newPrompt.replace(/`/g, "\\`")}\`
};`;

  fs.writeFileSync(promptFilePath, fileContent, "utf-8");

  res.json({
    success: true,
    message: "Prompt updated successfully. Restart server to apply.",
  });
});

module.exports = router;
