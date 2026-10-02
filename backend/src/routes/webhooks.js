const express = require("express");
const router = express.Router();
const aiAgent = require("../services/aiAgent");
const fbPlatform = require("../services/platforms/facebook");

router.post("/incoming", async (req, res) => {
  const { platform, senderId, messageText } = req.body;

  console.log(`[Webhooks /incoming] Processing webhook call: platform=${platform}, senderId=${senderId}`);

  if (!platform || !senderId || !messageText) {
    console.warn(`[Webhooks /incoming] Missing required fields: platform=${platform}, senderId=${senderId}, messageText=${messageText ? "present" : "missing"}`);
    return res.status(400).json({ error: "Missing required webhook fields" });
  }

  console.log(`[Webhooks /incoming] Sending 200 EVENT_RECEIVED status back to sender...`);
  res.status(200).send("EVENT_RECEIVED");

  if (req.io) {
    console.log(`[Webhooks /incoming] Emitting user message to Socket.IO dashboard: "${messageText}"`);
    req.io.emit("new_message", {
      platform,
      senderId,
      text: messageText,
      role: "user",
    });
  } else {
    console.warn(`[Webhooks /incoming] Socket.IO instance (req.io) is not available!`);
  }

  console.log(`[Webhooks /incoming] Requesting AI response for sender ${senderId}...`);
  const aiResponseText = await aiAgent.generateResponse(senderId, messageText, platform);
  console.log(`[Webhooks /incoming] AI response completed: "${aiResponseText}"`);

  if (req.io) {
    console.log(`[Webhooks /incoming] Emitting AI response to Socket.IO dashboard: "${aiResponseText}"`);
    req.io.emit("new_message", {
      platform,
      senderId,
      text: aiResponseText,
      role: "assistant",
    });
  }

  console.log(`[Webhooks /incoming] Routing response to platform: ${platform}`);
  switch (platform.toLowerCase()) {
    case "facebook":
      try {
        await fbPlatform.sendFacebookMessage(senderId, aiResponseText);
        console.log(`[Webhooks /incoming] Message sent back to Facebook successfully.`);
      } catch (err) {
        console.error(`[Webhooks /incoming] Error sending message back to Facebook:`, err.message);
      }
      break;
    default:
      console.warn(`[Webhooks /incoming] Unknown or unsupported platform: ${platform}`);
  }
  console.log(`[Webhooks /incoming] Finished processing incoming message.`);
});

router.get("/meta", (req, res) => {
  console.log("[Webhooks] Meta webhook verification", req.query);
  const verifyToken = process.env.META_VERIFY_TOKEN;
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  console.log("[Webhooks] Meta webhook verification", req.query);

  if (mode === "subscribe" && token === verifyToken) {
    console.log("[Webhooks] Meta webhook verified");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

router.post("/meta", async (req, res) => {
  console.log("[Webhooks] Meta webhook post", JSON.stringify(req.body, null, 2));
  const body = req.body;

  let events = [];

  // 1. Handle standard Facebook messaging format
  if (body.entry && Array.isArray(body.entry)) {
    for (const entry of body.entry) {
      if (entry.messaging && Array.isArray(entry.messaging)) {
        events.push(...entry.messaging);
      }
    }
  }
  // 2. Handle Meta Developer Dashboard "Sample Payload" format
  else if (body.sample && body.sample.value) {
    events.push(body.sample.value);
  }

  if (events.length === 0) {
    console.log("[Webhooks] No messaging events found in payload");
    return res.status(200).send("EVENT_RECEIVED");
  }

  for (const webhook_event of events) {
    // Get the sender PSID, recipient (Page ID), and message content
    const senderId = webhook_event.sender ? webhook_event.sender.id : null;
    const recipientId = webhook_event.recipient ? webhook_event.recipient.id : null;
    const message = webhook_event.message;

    if (senderId && message && message.text) {
      const messageText = message.text;
      console.log(
        `[Webhooks] Received Meta message: "${messageText}" from ${senderId} to Page ${recipientId}`,
      );

      // 1. Emit to dashboard
      if (req.io) {
        req.io.emit("new_message", {
          platform: "facebook",
          senderId,
          text: messageText,
          role: "user",
        });
      }

      // 2. Generate AI response
      const aiResponseText = await aiAgent.generateResponse(
        senderId,
        messageText,
        "facebook",
      );

      // 3. Emit AI response to dashboard
      if (req.io) {
        req.io.emit("new_message", {
          platform: "facebook",
          senderId,
          text: aiResponseText,
          role: "assistant",
        });
      }

      // 4. Send reply back to Facebook using the dynamic Page ID
      try {
        await fbPlatform.sendFacebookMessage(senderId, aiResponseText, recipientId);
      } catch (error) {
        console.error("[Webhooks] Error sending Facebook message:", error.message);
      }
    }
  }

  // Returns a '200 OK' response to all requests
  res.status(200).send("EVENT_RECEIVED");
});

module.exports = router;
