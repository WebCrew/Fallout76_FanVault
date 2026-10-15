const channels = ["Lobby", "Ingame", "Tutorials", "Guild News"];
const channelDescriptions = {
  "Lobby": "General guild conversation.",
  "Ingame": "Live team talk during events and runs.",
  "Tutorials": "Tips, builds and route help.",
  "Guild News": "Announcements and important updates."
};
const channelMessages = {
  "Lobby": [
    { meta: "System", text: "Local demo only; not connected to Net-Twin. Press Ctrl + Shift + F to hide or show the client.", className: "system-message" },
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

module.exports = {
  id: "fallout76",
  name: "Fallout 76",
  windowTitle: "FanVault - Fallout 76 Clan Companion",
  launcherMark: "76",
  platforms: ["PC", "Xbox", "PlayStation"],
  channels,
  channelDescriptions,
  demoMessages: channelMessages
};
