const http = require("http");
const WebSocket = require("ws");

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3001;

function sendJson(socket, payload) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function startLocalServer({ host = DEFAULT_HOST, port = DEFAULT_PORT } = {}) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((_request, response) => {
      response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("FanVault local chat service running");
    });
    const webSocketServer = new WebSocket.Server({ server });
    const clients = new Map();

    webSocketServer.on("connection", (socket) => {
      socket.userName = null;

      socket.on("message", (message) => {
        try {
          const payload = JSON.parse(String(message));
          if (payload.type === "register") {
            socket.userName = payload.from || "VaultDweller";
            clients.set(socket.userName, socket);
          } else if (payload.type === "chat") {
            webSocketServer.clients.forEach((client) => sendJson(client, payload));
          } else if (payload.type === "dm") {
            sendJson(socket, payload);
            const target = clients.get(payload.to);
            if (target && target !== socket) sendJson(target, payload);
          }
        } catch (_error) {
          // Ignore malformed local messages instead of interrupting the overlay.
        }
      });

      socket.on("close", () => {
        if (socket.userName && clients.get(socket.userName) === socket) {
          clients.delete(socket.userName);
        }
      });
    });

    server.once("error", reject);
    server.listen(port, host, () => {
      server.removeListener("error", reject);
      resolve({
        close: () => new Promise((done) => {
          webSocketServer.clients.forEach((client) => client.close());
          webSocketServer.close(() => server.close(done));
        }),
        host,
        port
      });
    });
  });
}

module.exports = { startLocalServer };
