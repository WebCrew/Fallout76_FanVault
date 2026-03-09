const ws = new WebSocket("ws://localhost:3001");

const messages = document.getElementById("messages");
const msgBox = document.getElementById("msg");
const sendBtn = document.getElementById("sendBtn");
const imageInput = document.getElementById("imageInput");
const uploadNote = document.getElementById("uploadNote");
const emojiBtn = document.getElementById("emojiBtn");
const emojiPicker = document.getElementById("emojiPicker");
const modalBackdrop = document.getElementById("modalBackdrop");
const tooltip = document.getElementById("avatarTooltip");
const chatDock = document.getElementById("chatDock");
const channelTabs = Array.from(document.querySelectorAll(".channel-tab"));
const chatSubtitle = document.querySelector(".chat-header p");

const emojiSet = ["😀","😁","😂","🙂","😉","😍","😎","🤝","👍","👎","🔥","⚡","💀","🎯","🎮","🛠️","📦","💬","🚀","⭐","🍻","😴","😅","🤷","✅","❌","🧭","🏕️","💰","🎉"];
const channels = ["Lobby", "Ingame", "Tutorials", "Guild News"];
const channelDescriptions = {
  "Lobby": "General guild conversation.",
  "Ingame": "Live team talk during events and runs.",
  "Tutorials": "Tips, builds and route help.",
  "Guild News": "Announcements and important updates."
};
const seededMessages = {
  "Lobby": [
    { meta: "System", text: "FanVault connected. Press Ctrl + Shift + F to hide or show the client.", className: "system-message" },
    { meta: "RangerOne · 16:05", text: "Anyone up for Daily Ops later?" },
    { meta: "AshMara · 16:06", text: "I can join after this event run." }
  ],
  "Ingame": [
    { meta: "MothSix · 16:09", text: "Encryptid in 5 minutes. Meet at the station." },
    { meta: "VaultAnne · 16:10", text: "On my way. Need one more for the group." }
  ],
  "Tutorials": [
    { meta: "GuideBot", text: "Tip: Use lunchboxes before Expedition runs for faster XP stacking.", className: "system-message" },
    { meta: "RangerOne · 16:15", text: "I uploaded a route map yesterday. Check pinned notes later." }
  ],
  "Guild News": [
    { meta: "Guild News", text: "Saturday 19:00 - Event Night / Nuke Runs / Trade Session.", className: "system-message" },
    { meta: "Guild News", text: "New members should post their playstyle and platform links in Profile.", className: "system-message" }
  ]
};

const modalMap = {
  "open-voice": "voiceModal",
  "open-members": "membersModal",
  "open-menu": "menuModal",
  "open-settings": "settingsModal",
  "open-profile-from-menu": "profileModal"
};

let currentChannel = "Lobby";
const channelMessages = {};
channels.forEach((channel) => {
  channelMessages[channel] = [...(seededMessages[channel] || [])];
});

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function createLinkPreview(url) {
  const safeUrl = escapeHtml(url);
  return `<a class="link-preview" href="${safeUrl}" target="_blank" rel="noreferrer">${safeUrl}</a>`;
}

function normalizeMessage(raw) {
  if (typeof raw === "string") {
    return { channel: currentChannel, meta: "Guild · now", text: raw };
  }
  return {
    channel: channels.includes(raw.channel) ? raw.channel : "Lobby",
    meta: raw.meta || "Guild · now",
    text: raw.text || "",
    className: raw.className || ""
  };
}

function appendToStore(raw) {
  const entry = normalizeMessage(raw);
  if (!channelMessages[entry.channel]) channelMessages[entry.channel] = [];
  channelMessages[entry.channel].push(entry);
  if (entry.channel === currentChannel) {
    renderMessages();
  }
}

function renderMessages() {
  messages.innerHTML = "";
  (channelMessages[currentChannel] || []).forEach((entry) => {
    const article = document.createElement("article");
    article.className = `message ${entry.className || ""}`.trim();

    const urlMatch = entry.text.match(/https?:\/\/\S+/i);
    let content = escapeHtml(entry.text).replace(/\n/g, "<br>");
    if (urlMatch) {
      content += `<br>${createLinkPreview(urlMatch[0])}`;
    }

    article.innerHTML = `<span class="message-meta">${escapeHtml(entry.meta)}</span><p>${content}</p>`;
    messages.appendChild(article);
  });
  messages.scrollTop = messages.scrollHeight;
}

function setChannel(channel) {
  currentChannel = channel;
  channelTabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.channel === channel);
  });
  chatSubtitle.textContent = channelDescriptions[channel] || channel;
  renderMessages();
}

function handleSend() {
  const value = msgBox.value.trim();
  if (!value) return;
  const payload = {
    type: "chat",
    channel: currentChannel,
    meta: "You · now",
    text: value
  };
  ws.send(JSON.stringify(payload));
  msgBox.value = "";
}

sendBtn.addEventListener("click", handleSend);
msgBox.addEventListener("keydown", (event) => {
  if (event.key === "Enter") handleSend();
  if (event.key === "Escape") {
    emojiPicker.classList.add("hidden");
  }
});

channelTabs.forEach((tab) => {
  tab.dataset.channel = tab.textContent.trim();
  tab.addEventListener("click", () => setChannel(tab.dataset.channel));
});

document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.action;
    if (action === "toggle-chat") {
      chatDock.classList.toggle("hidden");
      return;
    }

    const modalId = modalMap[action];
    if (modalId) openModal(modalId);
  });
});

function openModal(id) {
  closeAllModals();
  document.getElementById(id)?.classList.remove("hidden");
  modalBackdrop.classList.remove("hidden");
}

function closeAllModals() {
  document.querySelectorAll(".modal").forEach((modal) => modal.classList.add("hidden"));
  modalBackdrop.classList.add("hidden");
}

modalBackdrop.addEventListener("click", closeAllModals);
document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", closeAllModals));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeAllModals();
    emojiPicker.classList.add("hidden");
    chatDock.classList.add("hidden");
  }
});

emojiSet.forEach((emoji) => {
  const btn = document.createElement("button");
  btn.className = "emoji-item";
  btn.textContent = emoji;
  btn.addEventListener("click", () => {
    msgBox.value += emoji;
    msgBox.focus();
  });
  emojiPicker.appendChild(btn);
});

emojiBtn.addEventListener("click", () => {
  emojiPicker.classList.toggle("hidden");
});

imageInput.addEventListener("change", () => {
  const file = imageInput.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const article = document.createElement("article");
    article.className = "message";
    article.innerHTML = `<span class="message-meta">You · image · ${escapeHtml(currentChannel)}</span><p>Uploaded image<br><img class="image-preview" src="${reader.result}" alt="uploaded image" /></p>`;
    messages.appendChild(article);
    messages.scrollTop = messages.scrollHeight;
  };
  reader.readAsDataURL(file);
  uploadNote.textContent = file.name;
});

ws.addEventListener("message", (event) => {
  try {
    const payload = JSON.parse(String(event.data));
    if (payload.type === "chat") {
      appendToStore(payload);
      return;
    }
  } catch (error) {
    appendToStore({ channel: currentChannel, meta: "Guild · now", text: String(event.data) });
  }
});

ws.addEventListener("open", () => {
  appendToStore({ channel: "Lobby", meta: "System", text: "Connection to FanVault server established.", className: "system-message" });
  setChannel(currentChannel);
});

ws.addEventListener("close", () => {
  appendToStore({ channel: "Lobby", meta: "System", text: "Server connection closed.", className: "system-message" });
});

document.querySelectorAll(".member-avatar").forEach((avatar) => {
  avatar.addEventListener("mouseenter", (event) => {
    tooltip.textContent = `${avatar.dataset.name}\n${avatar.dataset.state}\n${avatar.dataset.voice}`;
    tooltip.classList.remove("hidden");
    positionTooltip(event);
  });
  avatar.addEventListener("mousemove", positionTooltip);
  avatar.addEventListener("mouseleave", () => tooltip.classList.add("hidden"));
});

function positionTooltip(event) {
  tooltip.style.left = `${event.clientX + 14}px`;
  tooltip.style.top = `${event.clientY + 14}px`;
}

setChannel(currentChannel);
