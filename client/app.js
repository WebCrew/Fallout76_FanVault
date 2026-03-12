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
const avatarMenu = document.getElementById("avatarMenu");
const chatDock = document.getElementById("chatDock");
const channelTabs = Array.from(document.querySelectorAll(".channel-tab"));
const chatSubtitle = document.querySelector(".chat-header p");
const dmTabs = document.getElementById("dmTabs");
const dmRowWrap = document.getElementById("dmRowWrap");
const profileName = document.getElementById("profileName");
const profileAvatar = document.getElementById("profileAvatar");
const profileStatus = document.getElementById("profileStatus");
const profileTags = document.getElementById("profileTags");
const emojiSet = ["😀","😁","😂","🙂","😉","😍","😎","🤝","👍","👎","🔥","⚡","💀","🎯","🎮","🛠️","📦","💬","🚀","⭐","🍻","😴","😅","🤷","✅","❌","🧭","🏕️","💰","🎉"];
const channels = ["Lobby", "Ingame", "Tutorials", "Guild News"];
const channelDescriptions = {
  "Lobby": "General guild conversation.",
  "Ingame": "Live team talk during events and runs.",
  "Tutorials": "Tips, builds and route help.",
  "Guild News": "Announcements and important updates."
};
const channelMessages = {
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
const dmMessages = {};
const modalMap = {
  "open-voice": "voiceModal",
  "open-members": "membersModal",
  "open-menu": "menuModal",
  "open-settings": "settingsModal",
  "open-profile-from-menu": "profileModal"
};
let currentContext = { type: "channel", key: "Lobby" };
let currentMember = null;
const usernameKey = "fanvault_username";
let userName = localStorage.getItem(usernameKey) || "VaultDweller";
if (!localStorage.getItem(usernameKey)) {
  const chosen = window.prompt("Choose your FanVault name", userName);
  if (chosen && chosen.trim()) {
    userName = chosen.trim();
    localStorage.setItem(usernameKey, userName);
  }
}
const clientId = localStorage.getItem("fanvault_client_id") || `client-${Math.random().toString(36).slice(2,10)}`;
localStorage.setItem("fanvault_client_id", clientId);
function escapeHtml(str = "") {
  return str.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': '&quot;' }[char] || char));
}
function createLinkPreview(url) {
  const safeUrl = escapeHtml(url);
  return `<a class="link-preview" href="${safeUrl}" target="_blank" rel="noreferrer">${safeUrl}</a>`;
}
function normalizeMessage(raw) {
  return {
    type: raw.type || "chat",
    channel: channels.includes(raw.channel) ? raw.channel : "Lobby",
    from: raw.from || raw.meta || "Guild",
    to: raw.to || null,
    meta: raw.meta || `${raw.from || "Guild"} · now`,
    text: raw.text || "",
    className: raw.className || ""
  };
}
function appendToChannel(raw) {
  const entry = normalizeMessage(raw);
  if (!channelMessages[entry.channel]) channelMessages[entry.channel] = [];
  channelMessages[entry.channel].push(entry);
  if (currentContext.type === "channel" && currentContext.key === entry.channel) renderMessages();
}
function appendToDm(raw) {
  const entry = normalizeMessage(raw);
  const partner = entry.from === userName ? entry.to : entry.from;
  if (!partner) return;
  if (!dmMessages[partner]) dmMessages[partner] = [];
  dmMessages[partner].push(entry);
  syncDmTabs();
  if (currentContext.type === "dm" && currentContext.key === partner) renderMessages();
}
function renderMessages() {
  messages.innerHTML = "";
  const entries = currentContext.type === "channel" ? (channelMessages[currentContext.key] || []) : (dmMessages[currentContext.key] || []);
  entries.forEach((entry) => {
    const article = document.createElement("article");
    article.className = `message ${entry.className || ""}`.trim();
    const urlMatch = entry.text.match(/https?:\/\/\S+/i);
    let content = escapeHtml(entry.text).replace(/\n/g, "<br>");
    if (urlMatch) content += `<br>${createLinkPreview(urlMatch[0])}`;
    article.innerHTML = `<span class="message-meta">${escapeHtml(entry.meta)}</span><p>${content}</p>`;
    messages.appendChild(article);
  });
  messages.scrollTop = messages.scrollHeight;
}
function setChannel(channel) {
  currentContext = { type: "channel", key: channel };
  channelTabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.channel === channel));
  document.querySelectorAll(".dm-tab").forEach((tab) => tab.classList.remove("is-active"));
  chatSubtitle.textContent = channelDescriptions[channel] || channel;
  renderMessages();
}
function setDm(name) {
  currentContext = { type: "dm", key: name };
  channelTabs.forEach((tab) => tab.classList.remove("is-active"));
  document.querySelectorAll(".dm-tab").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.dm === name));
  chatSubtitle.textContent = `Private chat with ${name}`;
  renderMessages();
}
function syncDmTabs() {
  dmTabs.innerHTML = "";
  const keys = Object.keys(dmMessages);
  dmRowWrap.classList.toggle("hidden", keys.length === 0);
  keys.forEach((name) => {
    const btn = document.createElement("button");
    btn.className = "dm-tab";
    btn.dataset.dm = name;
    btn.textContent = name;
    if (currentContext.type === "dm" && currentContext.key === name) btn.classList.add("is-active");
    btn.addEventListener("click", () => setDm(name));
    dmTabs.appendChild(btn);
  });
}
function handleSend() {
  const value = msgBox.value.trim();
  if (!value) return;
  if (currentContext.type === "channel") {
    ws.send(JSON.stringify({ type: "chat", channel: currentContext.key, from: userName, text: value }));
  } else {
    ws.send(JSON.stringify({ type: "dm", from: userName, to: currentContext.key, text: value }));
  }
  msgBox.value = "";
}
function openModal(id) {
  closeAllModals();
  document.getElementById(id)?.classList.remove("hidden");
  modalBackdrop.classList.remove("hidden");
}
function closeAllModals() {
  document.querySelectorAll(".modal").forEach((modal) => modal.classList.add("hidden"));
  modalBackdrop.classList.add("hidden");
}
function hideContextMenu() {
  avatarMenu.classList.add("hidden");
}
function fillProfile(member) {
  profileName.textContent = member.name;
  profileAvatar.textContent = member.name.charAt(0).toUpperCase();
  profileStatus.textContent = `${member.state} · ${member.voice}`;
  profileTags.innerHTML = "";
  String(member.playstyle || "Mixed / Social").split("/").map(x=>x.trim()).filter(Boolean).forEach((tag) => {
    const span = document.createElement("span");
    span.className = "tag";
    span.textContent = tag;
    profileTags.appendChild(span);
  });
}
function openAvatarMenu(member, x, y) {
  currentMember = member;
  avatarMenu.style.left = `${x}px`;
  avatarMenu.style.top = `${y}px`;
  avatarMenu.classList.remove("hidden");
}
sendBtn.addEventListener("click", handleSend);
msgBox.addEventListener("keydown", (event) => {
  if (event.key === "Enter") handleSend();
  if (event.key === "Escape") {
    emojiPicker.classList.add("hidden");
    hideContextMenu();
    closeAllModals();
    chatDock.classList.add("hidden");
  }
});
channelTabs.forEach((tab) => {
  tab.dataset.channel = tab.textContent.trim();
  tab.addEventListener("click", () => setChannel(tab.dataset.channel));
});
document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.action;
    hideContextMenu();
    if (action === "toggle-chat") {
      chatDock.classList.toggle("hidden");
      return;
    }
    const modalId = modalMap[action];
    if (modalId) openModal(modalId);
  });
});
document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", closeAllModals));
modalBackdrop.addEventListener("click", closeAllModals);
document.addEventListener("click", (event) => {
  if (!avatarMenu.contains(event.target) && !event.target.closest('.member-avatar')) hideContextMenu();
});
document.querySelectorAll("[data-context-action]").forEach((button) => {
  button.addEventListener("click", () => {
    if (!currentMember) return;
    const action = button.dataset.contextAction;
    if (action === "dm") {
      if (!dmMessages[currentMember.name]) dmMessages[currentMember.name] = [
        { from: currentMember.name, to: userName, meta: `${currentMember.name} · now`, text: `Opened a private line with ${currentMember.name}.`, className: "system-message" }
      ];
      syncDmTabs();
      setDm(currentMember.name);
    } else if (action === "invite") {
      uploadNote.textContent = `Squad invite sent to ${currentMember.name}`;
    } else if (action === "profile") {
      fillProfile(currentMember);
      openModal("profileModal");
    }
    hideContextMenu();
  });
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
emojiBtn.addEventListener("click", () => emojiPicker.classList.toggle("hidden"));
imageInput.addEventListener("change", () => {
  const file = imageInput.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const article = document.createElement("article");
    article.className = "message";
    article.innerHTML = `<span class="message-meta">${escapeHtml(userName)} · image</span><p>Uploaded image<br><img class="image-preview" src="${reader.result}" alt="uploaded image" /></p>`;
    messages.appendChild(article);
    messages.scrollTop = messages.scrollHeight;
  };
  reader.readAsDataURL(file);
  uploadNote.textContent = file.name;
});
function positionTooltip(event) {
  tooltip.style.left = `${event.clientX + 14}px`;
  tooltip.style.top = `${event.clientY + 14}px`;
}
document.querySelectorAll(".member-avatar").forEach((avatar) => {
  const member = {
    name: avatar.dataset.name,
    state: avatar.dataset.state,
    voice: avatar.dataset.voice,
    playstyle: avatar.dataset.playstyle || "Mixed / Social"
  };
  avatar.addEventListener("mouseenter", (event) => {
    tooltip.textContent = `${member.name}
${member.state}
${member.voice}`;
    tooltip.classList.remove("hidden");
    positionTooltip(event);
  });
  avatar.addEventListener("mousemove", positionTooltip);
  avatar.addEventListener("mouseleave", () => tooltip.classList.add("hidden"));
  avatar.addEventListener("click", (event) => {
    event.stopPropagation();
    openAvatarMenu(member, event.clientX + 8, event.clientY + 8);
  });
});
ws.addEventListener("open", () => {
  ws.send(JSON.stringify({ type: "register", from: userName, clientId }));
  appendToChannel({ channel: "Lobby", meta: "System", text: `Connection established as ${userName}.`, className: "system-message" });
  setChannel("Lobby");
});
ws.addEventListener("message", (event) => {
  try {
    const payload = JSON.parse(String(event.data));
    if (payload.type === "chat") {
      payload.meta = `${payload.from} · now`;
      appendToChannel(payload);
    }
    if (payload.type === "dm") {
      payload.meta = `${payload.from} · now`;
      appendToDm(payload);
    }
  } catch (error) {
    appendToChannel({ channel: "Lobby", meta: "Guild · now", text: String(event.data) });
  }
});
ws.addEventListener("close", () => {
  appendToChannel({ channel: "Lobby", meta: "System", text: "Server connection closed.", className: "system-message" });
});
setChannel("Lobby");