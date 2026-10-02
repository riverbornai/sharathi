const express = require("express");
const router = express.Router();
const axios = require("axios");
const pageStore = require("../services/pageStore");

// Get platform connection status and list of dynamic pages
router.get("/status", (req, res) => {
  console.log("Platform status requested");
  const dynamicPages = pageStore.getAllPages();
  const redirectUri =
    process.env.META_REDIRECT_URI ||
    `${req.protocol}://${req.get("host")}/facebook-callback`;
  res.json({
    platforms: {
      facebook: !!process.env.PAGE_ACCESS_TOKEN || dynamicPages.length > 0,
    },
    connectedPages: dynamicPages,
    redirectUri: redirectUri,
  });
});

// 1. Initialize Facebook OAuth 2.0 flow
router.get("/facebook/auth", (req, res) => {
  const appId = process.env.META_APP_ID;
  if (!appId) {
    return res.status(500).send("META_APP_ID is not configured in .env");
  }

  const redirectUri =
    process.env.META_REDIRECT_URI ||
    `${req.protocol}://${req.get("host")}/facebook-callback`;
  const scopes = [
    "pages_show_list",
    "pages_messaging",
    "pages_manage_metadata",
    "pages_read_engagement",
  ].join(",");

  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}`;
  console.log(`[Facebook OAuth] Redirecting to: ${authUrl}`);
  res.redirect(authUrl);
});

// 2. Handle Facebook OAuth callback logic (GET & POST)
async function handleFacebookOAuthCallback(req, res, code) {
  if (!code) {
    return res.status(400).json({ error: "No authorization code provided." });
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri =
    process.env.META_REDIRECT_URI ||
    `${req.protocol}://${req.get("host")}/facebook-callback`;

  try {
    // A. Exchange code for short-lived User Access Token
    console.log("[Facebook OAuth] Exchanging code for short-lived token...");
    const tokenResponse = await axios.get(
      "https://graph.facebook.com/v19.0/oauth/access_token",
      {
        params: {
          client_id: appId,
          redirect_uri: redirectUri,
          client_secret: appSecret,
          code,
        },
      },
    );

    const shortUserToken = tokenResponse.data.access_token;

    // B. Exchange for long-lived User Access Token
    console.log("[Facebook OAuth] Exchanging for long-lived token...");
    const longTokenResponse = await axios.get(
      "https://graph.facebook.com/v19.0/oauth/access_token",
      {
        params: {
          grant_type: "fb_exchange_token",
          client_id: appId,
          client_secret: appSecret,
          fb_exchange_token: shortUserToken,
        },
      },
    );

    const longUserToken = longTokenResponse.data.access_token;

    // C. Get user's managed Facebook pages and their page tokens
    console.log("[Facebook OAuth] Fetching user pages...");
    const pagesResponse = await axios.get(
      "https://graph.facebook.com/v19.0/me/accounts",
      {
        params: {
          access_token: longUserToken,
        },
      },
    );

    const pages = pagesResponse.data.data;

    if (!pages || pages.length === 0) {
      return res
        .status(400)
        .json({ error: "No Facebook pages found for this user." });
    }

    // D. Save each page to local pageStore and subscribe to webhooks
    for (const page of pages) {
      pageStore.savePage(page.id, page.name, page.access_token);

      // Subscribe to app webhooks automatically
      try {
        await axios.post(
          `https://graph.facebook.com/v19.0/${page.id}/subscribed_apps`,
          null,
          {
            params: {
              subscribed_fields: "messages,messaging_postbacks",
              access_token: page.access_token,
            },
          },
        );
        console.log(
          `[Facebook] Subscribed page ${page.name} (${page.id}) to webhooks.`,
        );
      } catch (err) {
        console.error(
          `[Facebook] Failed to subscribe page ${page.name}:`,
          err.response?.data || err.message,
        );
      }
    }

    // Return success JSON
    res.json({
      success: true,
      message: "Facebook pages connected successfully.",
      count: pages.length,
    });
  } catch (error) {
    console.error(
      "[Facebook OAuth] Callback error:",
      error.response?.data || error.message,
    );
    res.status(500).json({
      error:
        "Authentication failed: " +
        (error.response?.data?.error?.message || error.message),
    });
  }
}

router.post("/facebook/callback", async (req, res) => {
  const code = req.body?.code || req.query?.code;
  console.log("Callback code:", code);
  await handleFacebookOAuthCallback(req, res, code);
});

// 3. Get all dynamically connected Facebook Pages
router.get("/facebook/pages", (req, res) => {
  const pages = pageStore.getAllPages();
  res.json({ pages });
});

// 4. Remove a connected page
router.delete("/facebook/pages/:pageId", (req, res) => {
  const { pageId } = req.params;
  const deleted = pageStore.deletePage(pageId);
  if (deleted) {
    res.json({ success: true, message: "Page removed successfully." });
  } else {
    res.status(404).json({ error: "Page not found." });
  }
});

module.exports = router;
