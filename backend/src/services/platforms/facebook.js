const axios = require("axios");
const pageStore = require("../pageStore");

async function sendFacebookMessage(recipientId, text, pageIdOrToken = null) {
  console.log(`[Facebook] Sending message to ${recipientId}: ${text}`);
  try {
    let accessToken = null;

    if (pageIdOrToken) {
      if (pageIdOrToken.startsWith("EAA")) {
        accessToken = pageIdOrToken;
      } else {
        const page = pageStore.getPage(pageIdOrToken);
        if (page) {
          accessToken = page.accessToken;
        }
      }
    }

    if (!accessToken) {
      accessToken = process.env.PAGE_ACCESS_TOKEN;
    }

    console.log(`[Facebook] Access token: ${accessToken ? accessToken.substring(0, 10) + "..." : "none"}`);
    
    if (!accessToken) {
      console.warn(
        "[Facebook] Missing PAGE_ACCESS_TOKEN. Mocking message send.",
      );
      console.log(`[Facebook -> ${recipientId}]: ${text}`);
      return;
    }

    await axios.post(
      `https://graph.facebook.com/v19.0/me/messages?access_token=${accessToken}`,
      {
        recipient: { id: recipientId },
        message: { text },
      },
    );
    console.log(`[Facebook] Delivered to ${recipientId}`);
  } catch (error) {
    console.error(
      "[Facebook] Error sending message:",
      error.response?.data || error.message,
    );
  }
}

module.exports = { sendFacebookMessage };

