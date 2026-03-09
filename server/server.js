const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const clients = new Set();

function broadcast(payload) {
  const data = JSON.stringify(payload);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

wss.on("connection", (ws) => {
  clients.add(ws);

  ws.on("message", (message) => {
    try {
      const payload = JSON.parse(String(message));
      if (payload.type === "chat") {
        broadcast({
          type: "chat",
          channel: payload.channel || "Lobby",
          meta: payload.meta || "Guild · now",
          text: payload.text || ""
        });
        return;
      }
    } catch (error) {
      broadcast({ type: "chat", channel: "Lobby", meta: "Guild · now", text: String(message) });
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
  });
});

app.get("/", (req, res) => {
  res.send("FanVault server running");
});

server.listen(3001, () => {
  console.log("FanVault server scaffold listening on http://localhost:3001");
});
