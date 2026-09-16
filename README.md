# FanVault v0.4 — Step 5
Fallout 76 Clan Companion

## Step 2: real overlay shell
- compact circular launcher instead of a full desktop window
- drag the launcher to a safe position on any display, whether the widget is open or closed
- drag the open widget from its title to move it during play
- resize the open widget from its lower-right corner
- click the launcher to open the chat beside it
- panel automatically opens left or right depending on screen position
- launcher position is remembered between sessions
- transparent, frameless, always-on-top Electron window
- secure preload bridge with context isolation enabled
- `Esc` collapses the chat back to the launcher

## Included in this build
- circular overlay launcher with in-panel controls
- resizable chat panel with member tooltips and context menus that automatically stay inside the overlay
- avatar strip with status colors
- working chat categories: Lobby, Ingame, Tutorials, Guild News
- profile card modal
- popups for Voice, Members, Menu and Settings
- emoji picker
- image upload preview
- automatic link detection
- local websocket chat server

## Run locally
### Server
```bash
cd server
npm install
npm run dev
```

### Client
```bash
cd client
npm install
npm start
```

## Current focus
This version is mainly for UI and chat-flow testing.
Voice logic, moderation logic and full settings are still scaffold/demo level.

## Dependency maintenance
GitHub Dependabot checks the npm dependencies in `client` and `server` separately every Monday.


## Step 1 Update
- Avatar context menu
- Direct Messages (private chat)
- Squad invite action from avatar menu
- .gitignore included
