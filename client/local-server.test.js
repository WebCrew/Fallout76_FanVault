const WebSocket = require("ws");
const { startLocalServer } = require("./local-server");

async function run() {
  const service = await startLocalServer({ port: 3101 });
  const socket = new WebSocket("ws://127.0.0.1:3101");
  await new Promise((resolve, reject) => {
    socket.once("open", resolve);
    socket.once("error", reject);
  });

  const reply = new Promise((resolve, reject) => {
    socket.once("message", (data) => resolve(JSON.parse(String(data))));
    socket.once("error", reject);
  });
  socket.send(JSON.stringify({ type: "chat", from: "Test", text: "ready" }));
  const message = await reply;
  if (message.text !== "ready") throw new Error("Unexpected chat response");

  try {
    await startLocalServer({ port: 3101 });
    throw new Error("The occupied-port test unexpectedly started a second server");
  } catch (error) {
    if (error.code !== "EADDRINUSE") throw error;
  }

  socket.close();
  await new Promise((resolve) => socket.once("close", resolve));
  await service.close();
  console.log("Local chat service and occupied-port handling passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
