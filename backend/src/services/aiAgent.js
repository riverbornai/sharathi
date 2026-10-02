const OpenAI = require("openai");
const { systemPrompt } = require("../prompts/systemPrompt");
const messageStore = require("./messageStore");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateResponse(userId, userMessage, platform = "direct") {
  messageStore.addMessage(userId, "user", userMessage, platform);
  const messages = messageStore.getHistory(userId);

  try {
    const payload = {
      model: "gpt-4o",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: 200,
      temperature: 0.7,
    };

    const startTime = Date.now();
    const response = await openai.chat.completions.create(payload);
    const duration = Date.now() - startTime;

    console.log(`[AI Agent] OpenAI API success in ${duration}ms!`);
    const aiText = response.choices[0].message.content;
    console.log(`[AI Agent] Generated response: "${aiText}"`);

    messageStore.addMessage(userId, "assistant", aiText, platform);
    console.log(`[AI Agent] === Finished generateResponse successfully ===`);
    return aiText;
  } catch (error) {
    if (error.status) {
      console.error("[AI Agent] HTTP Status Code:", error.status);
    }
    if (error.response?.data) {
      console.error(
        "[AI Agent] Error Response Data:",
        JSON.stringify(error.response.data, null, 2),
      );
    } else {
      console.error("[AI Agent] Error Stack Trace:", error.stack);
    }
    console.log(`[AI Agent] Error Object:`, JSON.stringify(error, null, 2));
    console.error(`[AI Agent] === End of Error Details ===${error}`);
    return "I'm having a little trouble thinking right now. A human agent will take over shortly! 🛠️";
  }
}

module.exports = {
  generateResponse,
};
