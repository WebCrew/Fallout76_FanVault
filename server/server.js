const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const clients = new Map();

function sendJson(ws, payload) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
}

wss.on("connection", (ws) => {
  ws.userName = null;
  ws.clientId = null;

  ws.on("message", (message) => {
    try {
      const payload = JSON.parse(String(message));
      if (payload.type === "register") {
        ws.userName = payload.from || "VaultDweller";
        ws.clientId = payload.clientId || null;
        clients.set(ws.userName, ws);
        return;
      }
      if (payload.type === "chat") {
        wss.clients.forEach((client) => sendJson(client, payload));
        return;
      }
      if (payload.type === "dm") {
        sendJson(ws, payload);
        const target = clients.get(payload.to);
        if (target && target !== ws) sendJson(target, payload);
      }
    } catch (error) {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) client.send(String(message));
      });
    }
  });

  ws.on("close", () => {
    if (ws.userName && clients.get(ws.userName) === ws) clients.delete(ws.userName);
  });
});

app.get("/", (_req, res) => {
  res.send("FanVault server running");
});

server.listen(3001, () => {
  console.log("FanVault server scaffold listening on http://localhost:3001");
});
