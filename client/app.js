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
const appShell = document.querySelector(".app-shell");
const workspace = document.getElementById("workspace");
const vaultLauncher = document.getElementById("vaultLauncher");
const collapseBtn = document.getElementById("collapseBtn");
const chatTitlebar = document.getElementById("chatTitlebar");
const resizeGrip = document.getElementById("resizeGrip");
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
let overlayExpanded = false;
let dragState = null;
let widgetDragState = null;
let resizeState = null;
const usernameKey = "fanvault_username";
let userName = localStorage.getItem(usernameKey) || "VaultDweller";
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
  if (ws.readyState !== WebSocket.OPEN) {
    uploadNote.textContent = "Chat server is not connected yet";
    return;
  }
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
function placeFloatingElement(element, anchor) {
  const anchorRect = anchor.getBoundingClientRect();
  const gap = 8;
  const margin = 8;
  const width = element.offsetWidth;
  const height = element.offsetHeight;
  const rightPosition = anchorRect.right + gap;
  const leftPosition = anchorRect.left - width - gap;
  const left = rightPosition + width <= window.innerWidth - margin ? rightPosition : leftPosition;
  const top = Math.min(anchorRect.top, window.innerHeight - height - margin);
  element.style.left = `${Math.max(margin, left)}px`;
  element.style.top = `${Math.max(margin, top)}px`;
}
function openAvatarMenu(member, anchor) {
  currentMember = member;
  avatarMenu.classList.remove("hidden");
  placeFloatingElement(avatarMenu, anchor);
}

function applyOverlayLayout(nextLayout) {
  if (!nextLayout) return;
  overlayExpanded = Boolean(nextLayout.expanded);
  appShell.dataset.panelSide = nextLayout.panelSide || "right";
  chatDock.style.setProperty("--dock-width", `${nextLayout.panelWidth || 372}px`);
  chatDock.style.setProperty("--dock-height", `${nextLayout.panelHeight || 684}px`);
  vaultLauncher.style.left = `${(nextLayout.launcherX || 0) + 8}px`;
  vaultLauncher.style.top = `${(nextLayout.launcherY || 0) + 8}px`;
  workspace.classList.toggle("hidden", !overlayExpanded);
  vaultLauncher.setAttribute("aria-label", overlayExpanded ? "Close FanVault" : "Open FanVault");
}

async function setOverlayExpanded(nextExpanded) {
  if (!window.fanVaultOverlay) {
    applyOverlayLayout({ expanded: nextExpanded, launcherX: 0, launcherY: 0, panelSide: "right" });
    return;
  }
  applyOverlayLayout(await window.fanVaultOverlay.setExpanded(nextExpanded));
}

vaultLauncher.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  dragState = { pointerId: event.pointerId, startX: event.screenX, startY: event.screenY, offsetX: event.clientX, offsetY: event.clientY, moved: false, expandedAtStart: overlayExpanded };
  vaultLauncher.setPointerCapture(event.pointerId);
});

vaultLauncher.addEventListener("pointermove", (event) => {
  if (!dragState || dragState.pointerId !== event.pointerId) return;
  if (Math.hypot(event.screenX - dragState.startX, event.screenY - dragState.startY) > 5) dragState.moved = true;
  if (!dragState.moved || !window.fanVaultOverlay) return;
  vaultLauncher.classList.add("is-dragging");
  const pointer = { x: event.screenX, y: event.screenY, offsetX: dragState.offsetX, offsetY: dragState.offsetY };
  if (dragState.expandedAtStart) window.fanVaultOverlay.moveWidget(pointer);
  else window.fanVaultOverlay.moveLauncher(pointer);
});

vaultLauncher.addEventListener("pointerup", async (event) => {
  if (!dragState || dragState.pointerId !== event.pointerId) return;
  const wasMoved = dragState.moved;
  dragState = null;
  vaultLauncher.classList.remove("is-dragging");
  if (wasMoved) window.fanVaultOverlay?.commitPosition();
  if (!wasMoved) await setOverlayExpanded(!overlayExpanded);
});

vaultLauncher.addEventListener("pointercancel", () => {
  dragState = null;
  vaultLauncher.classList.remove("is-dragging");
  window.fanVaultOverlay?.commitPosition();
});

chatTitlebar.addEventListener("pointerdown", (event) => {
  if (!overlayExpanded || event.button !== 0 || event.target.closest("button")) return;
  widgetDragState = { pointerId: event.pointerId, offsetX: event.clientX, offsetY: event.clientY };
  chatTitlebar.setPointerCapture(event.pointerId);
  chatTitlebar.classList.add("is-dragging");
});
chatTitlebar.addEventListener("pointermove", (event) => {
  if (!widgetDragState || widgetDragState.pointerId !== event.pointerId) return;
  window.fanVaultOverlay?.moveWidget({ x: event.screenX, y: event.screenY, offsetX: widgetDragState.offsetX, offsetY: widgetDragState.offsetY });
});
function stopWidgetDrag() {
  widgetDragState = null;
  chatTitlebar.classList.remove("is-dragging");
  window.fanVaultOverlay?.commitPosition();
}
chatTitlebar.addEventListener("pointerup", stopWidgetDrag);
chatTitlebar.addEventListener("pointercancel", stopWidgetDrag);

resizeGrip.addEventListener("pointerdown", (event) => {
  if (!overlayExpanded || event.button !== 0) return;
  resizeState = { pointerId: event.pointerId, startX: event.screenX, startY: event.screenY, width: chatDock.offsetWidth, height: chatDock.offsetHeight };
  resizeGrip.setPointerCapture(event.pointerId);
  resizeGrip.classList.add("is-resizing");
});
resizeGrip.addEventListener("pointermove", async (event) => {
  if (!resizeState || resizeState.pointerId !== event.pointerId) return;
  const width = Math.round(resizeState.width + event.screenX - resizeState.startX);
  const height = Math.round(resizeState.height + event.screenY - resizeState.startY);
  applyOverlayLayout(await window.fanVaultOverlay?.resizeWidget({ width, height }));
});
function stopResize() {
  resizeState = null;
  resizeGrip.classList.remove("is-resizing");
  window.fanVaultOverlay?.commitPosition();
}
resizeGrip.addEventListener("pointerup", stopResize);
resizeGrip.addEventListener("pointercancel", stopResize);

collapseBtn.addEventListener("click", () => setOverlayExpanded(false));
window.fanVaultOverlay?.onLayout(applyOverlayLayout);
window.fanVaultOverlay?.getState().then(applyOverlayLayout);
sendBtn.addEventListener("click", handleSend);
msgBox.addEventListener("keydown", (event) => {
  if (event.key === "Enter") handleSend();
  if (event.key === "Escape") {
    emojiPicker.classList.add("hidden");
    hideContextMenu();
    closeAllModals();
    setOverlayExpanded(false);
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
      setOverlayExpanded(!overlayExpanded);
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
  placeFloatingElement(tooltip, event.currentTarget);
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
    openAvatarMenu(member, avatar);
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
