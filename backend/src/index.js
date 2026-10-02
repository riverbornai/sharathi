require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"),
});
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

const webhookRoutes = require("./routes/webhooks");
const messageRoutes = require("./routes/messages");
const platformRoutes = require("./routes/platforms");
const settingsRoutes = require("./routes/settings");
const chatRoutes = require("./routes/chat");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(bodyParser.json());

// Request logger middleware
app.use((req, res, next) => {
  console.log(`\n--- [HTTP Request] ${req.method} ${req.path} ---`);
  if (Object.keys(req.query).length > 0) {
    console.log(`[HTTP] Query Params:`, JSON.stringify(req.query, null, 2));
  }
  if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
    console.log(`[HTTP] Request Body:`, JSON.stringify(req.body, null, 2));
  }
  next();
});

// Serve React build in production
const clientBuild = path.join(__dirname, "../../frontend/dist");
app.use(express.static(clientBuild));

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use("/webhook", webhookRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/platforms", platformRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/chat", chatRoutes);

// SPA fallback - serve index.html for any non-API route (Express 5 syntax)
app.get("/{*path}", (req, res) => {
  if (
    !req.path.startsWith("/api") &&
    !req.path.startsWith("/webhook") &&
    !req.path.startsWith("/socket.io")
  ) {
    res.sendFile(path.join(clientBuild, "index.html"));
  }
});

io.on("connection", (socket) => {
  console.log("[Socket.IO] Frontend dashboard connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("[Socket.IO] Dashboard disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(
    `🚀 Social Chat Agent Server running on http://localhost:${PORT}`,
  );
});
