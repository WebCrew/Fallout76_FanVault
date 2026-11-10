async function initializeFanVault() {
const runtimeConfig = await window.fanVaultOverlay.getConfig();
const ws = runtimeConfig.transport.localChatUrl ? new WebSocket(runtimeConfig.transport.localChatUrl) : null;
document.querySelector(".launcher-mark").textContent = runtimeConfig.game.launcherMark;
document.getElementById("runtimeMode").textContent = ws ? "Prototype · Demo data · No Net-Twin connection" : "Text chat is not connected";
document.getElementById("configuredServer").textContent = ws ? "Local demo only" : "Chat unavailable";
const loginStatus = document.getElementById("loginStatus");
const loginCode = document.getElementById("loginCode");
const loginStart = document.getElementById("loginStart");
const loginCancel = document.getElementById("loginCancel");
const loginRefresh = document.getElementById("loginRefresh");
const loginSignOut = document.getElementById("loginSignOut");
const memberSearch = document.getElementById("memberSearch");
const memberForm = document.getElementById("memberSearchForm");
const memberTag = document.getElementById("memberGamertag");
const memberStatus = document.getElementById("memberSearchStatus");
const memberResults = document.getElementById("memberSearchResults");
const memberSubmit = memberForm.querySelector("button");
const memberErrors = {
  unauthorized: "Sign in with Net-Twin in Settings to search.",
  invalid_search: "Enter the full Fallout 76 gamertag.",
  gamertag_required: "Add your Fallout76 Gamer Tag in your Net-Twin profile settings, then search again.",
  slow_down: "Too many searches. Wait a minute and try again.",
  search_unavailable: "Net-Twin player search is currently unavailable."
};
let memberSearchAttempt = 0;
let memberAccount = null;
memberSearch.hidden = Boolean(ws);
document.getElementById("demoMembers").hidden = !ws;
memberForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const tag = memberTag.value.trim();
  if (!memberAccount || !tag) return;
  const attempt = ++memberSearchAttempt;
  memberSubmit.disabled = true;
  memberResults.replaceChildren();
  memberStatus.textContent = "Searching Net-Twin…";
  const result = await window.fanVaultOverlay.searchMembers(tag).catch(() => ({ error: "search_unavailable" }));
  if (attempt !== memberSearchAttempt) return;
  memberSubmit.disabled = false;
  if (result.error) {
    memberStatus.textContent = memberErrors[result.error] || memberErrors.search_unavailable;
    return;
  }
  memberStatus.textContent = result.players.length ? "Gamertags are self-reported." : "No matching player found.";
  for (const player of result.players) {
    const row = document.createElement("li");
    row.textContent = `${player.gamertag} · @${player.username}`;
    memberResults.append(row);
  }
});
const loginErrors = {
  expired_token: "The code expired. Start a new sign-in.",
  access_denied: "Sign-in was declined.",
  session_ended: "Your session ended. Sign in again.",
  service_unavailable: "Net-Twin sign-in is temporarily unavailable.",
  revocation_unknown: "Signed out locally. Server sign-out could not be confirmed."
};
function displayLogin(state) {
  const signedIn = state.phase === "authenticated";
  const waiting = state.phase === "starting" || state.phase === "pending";
  loginStatus.textContent = (state.error && loginErrors[state.error]) || ({
    unavailable: "Sign-in unavailable in this setup", idle: "Not signed in", starting: "Starting sign-in",
    pending: "Confirm in your browser", signing_out: "Signing out"
  }[state.phase]) || (signedIn ? `Signed in as ${state.user.name}` : "Sign-in unavailable");
  loginCode.hidden = state.phase !== "pending";
  loginCode.textContent = state.phase === "pending" ? `Enter this code on the Net-Twin page: ${state.code}` : "";
  loginStart.hidden = state.phase !== "idle" && state.phase !== "error";
  loginCancel.hidden = !waiting;
  loginRefresh.hidden = !signedIn;
  loginSignOut.hidden = !signedIn;
  const account = signedIn ? state.user.id : null;
  memberForm.hidden = !account;
  if (memberAccount !== account || (!account && !memberStatus.textContent)) {
    memberAccount = account;
    memberSearchAttempt++;
    memberForm.reset();
    memberSubmit.disabled = false;
    memberResults.replaceChildren();
    memberStatus.textContent = account ? "" : memberErrors.unauthorized;
  }
}
const loginActions = { startLogin: loginStart, cancelLogin: loginCancel, refreshLogin: loginRefresh, signOut: loginSignOut };
for (const [operation, button] of Object.entries(loginActions)) {
  button.addEventListener("click", () => {
    void window.fanVaultOverlay[operation]().then(displayLogin)
      .catch(() => displayLogin({ phase: "error", error: "service_unavailable" }));
  });
}
window.fanVaultOverlay.onLoginState(displayLogin);
void window.fanVaultOverlay.loginState().then(displayLogin)
  .catch(() => displayLogin({ phase: "unavailable" }));
const messages = document.getElementById("messages");
const msgBox = document.getElementById("msg");
const sendBtn = document.getElementById("sendBtn");
const imageBtn = document.getElementById("imageBtn");
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
const channels = runtimeConfig.game.channels;
const channelDescriptions = runtimeConfig.game.channelDescriptions;
const channelMessages = ws ? structuredClone(runtimeConfig.game.demoMessages) : {};
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
function normalizeMessage(raw) {
  if (raw.message_id) raw = window.FanVaultSngineChat.normalizeMessage(raw);
  return {
    ...raw,
    type: raw.type || "chat",
    channel: channels.includes(raw.channel) ? raw.channel : "Lobby",
    from: raw.from || raw.meta || "Guild",
    to: raw.to || null,
    meta: raw.meta || `${raw.from || "Guild"} · now`,
    text: typeof raw.text === "string" ? raw.text : "",
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
    window.FanVaultMessageView.appendMessage(document, messages, entry);
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
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    uploadNote.textContent = "No chat connection. Net-Twin chat is not integrated yet.";
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
    if (action === "exit-app") {
      closeAllModals();
      window.fanVaultOverlay?.requestQuit();
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
imageBtn.addEventListener("click", async () => {
  let image;
  try {
    image = await window.fanVaultOverlay?.pickImage();
  } catch (_error) {
    uploadNote.textContent = "Image could not be opened";
    return;
  }
  if (!image || image.canceled) return;
  if (image.error) {
    uploadNote.textContent = image.error;
    return;
  }
  const article = document.createElement("article");
  article.className = "message";
  article.innerHTML = `<span class="message-meta">${escapeHtml(userName)} · image</span><p>Uploaded image<br><img class="image-preview" src="${image.dataUrl}" alt="uploaded image" /></p>`;
  messages.appendChild(article);
  messages.scrollTop = messages.scrollHeight;
  uploadNote.textContent = image.name;
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
ws?.addEventListener("open", () => {
  ws.send(JSON.stringify({ type: "register", from: userName, clientId }));
  appendToChannel({ channel: "Lobby", meta: "System", text: `Local demo connected as ${userName}; this is not a Net-Twin identity.`, className: "system-message" });
  setChannel("Lobby");
});
ws?.addEventListener("message", (event) => {
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
ws?.addEventListener("close", () => {
  appendToChannel({ channel: "Lobby", meta: "System", text: "Server connection closed.", className: "system-message" });
});
setChannel("Lobby");

if (!ws) {
  sendBtn.disabled = true;
  uploadNote.textContent = "Net-Twin integration is not available in this build.";
}
}

initializeFanVault().catch(() => {
  document.getElementById("uploadNote").textContent = "FanVault configuration could not be loaded. Restart the desktop app.";
});
