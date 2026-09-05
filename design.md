# AeroGrab — Design Specification

## Overview

A modern, minimal dark-themed Electron desktop app for downloading YouTube videos using yt-dlp. Windows-only. Single accent color: green. Top-tab navigation.

---

## 1. Tech Stack

- **Runtime**: Electron 35 (Windows x64)
- **Bundler**: electron-vite 3 + Vite 6
- **Renderer**: React 19 + TypeScript
- **Packaging**: electron-builder 26 (NSIS installer)

### Installer (NSIS, assisted)
- 2-click flow: `[Install]` → progress → `[Finish]` (with launch-app checkbox). No welcome/license/directory/mode/language pages: no license file, fixed per-user location, single language, install-mode page skipped via `customInstallMode` in `build/installer.nsh`.
- Theme: app icon (exe/installer/uninstaller), dark sidebar + header bitmaps (`build/installerSidebar.bmp`, `build/installerHeader.bmp`), green progress bar (`InstallColors` in `customInit`), `BrandingText` already `"<app> <version>"`.
- **Downloader**: yt-dlp.exe + ffmpeg.exe (bundled via `extraResources`)

---

## 2. Color System

| Token | Value | Purpose |
|-------|-------|---------|
| `--bg-app` | `#0A0A0A` | App background |
| `--bg-surface` | `#111111` | Panels, titlebar, tabs |
| `--bg-elevated` | `#1A1A1A` | Cards, list items |
| `--bg-input` | `#1E1E1E` | Inputs, selects |
| `--bg-hover` | `#222222` | Hover state |
| `--bg-active` | `#2A2A2A` | Active/selected elements |
| `--border-subtle` | `#1F1F1F` | Subtle dividers |
| `--border-default` | `#2A2A2A` | Standard borders |
| `--border-strong` | `#333333` | Strong borders |
| `--text-primary` | `#E8E8E8` | Primary text |
| `--text-secondary` | `#999999` | Secondary text |
| `--text-muted` | `#666666` | Muted text, placeholders |
| `--text-inverse` | `#0A0A0A` | Text on accent backgrounds |
| `--accent` | `#22C55E` | Primary accent (green) |
| `--accent-hover` | `#16A34A` | Accent hover |
| `--accent-muted` | `rgba(34,197,94,0.15)` | Accent washed background |
| `--danger` | `#EF4444` | Errors, cancel |
| `--warning` | `#F59E0B` | Warnings |
| `--info` | `#3B82F6` | Info |

---

## 3. Typography

Font family: `'Space Grotesk Variable'` (bundled via `@fontsource-variable/space-grotesk`, full 300–700 range), fallback `'Space Grotesk', 'Segoe UI', system-ui, sans-serif`. Monospace for numbers/stats: `'Cascadia Code', monospace`.

| Size | Weight | Use |
|------|--------|-----|
| 24px | 600 | Page titles |
| 20px | 600 | Section headers |
| 16px | 500/600 | Card titles, tab labels |
| 14px | 400 | Body text |
| 13px | 400 | Secondary info |
| 11px | 500 | Badges, labels |

---

## 4. Layout

### Window
- **Size**: 900×680 (min: 750×550)
- **Frame**: frameless (`frame: false`), custom titlebar with drag region
- **Background**: `#0A0A0A`

### Startup Splash
- Borderless transparent 400×320 window (`src/renderer/splash.html`, bundled as a second renderer entry), shown instantly while the main window initializes
- Animated logo, indeterminate progress bar, live status messages (`splash-status`: components check → settings → ready); the 2.5s clock starts on the splash's first visible frame (load time doesn't eat into it), handoff waits for the main window then shows it before closing the splash for a gapless transition; warns (non-blocking) if yt-dlp/ffmpeg binaries are missing

### App Shell
```
┌──────────────────────────────────────────────┐
│  ≡  AeroGrab                         ─  ×   │  Titlebar (32px)
├──────────────────────────────────────────────┤
│    [Home]   [Queue]   [History]  [Settings] │  Tabs (44px)
├──────────────────────────────────────────────┤
│                                              │
│               Page Content Area              │  Scrollable
│                                              │
└──────────────────────────────────────────────┘
```

### Titlebar (32px)
- Drag region, left: app icon + "AeroGrab"
- Right: minimize + close buttons (no-drag), close turns red on hover
- Bottom border: `--border-subtle`

### Tabs (44px)
- Centered, bottom border `--border-subtle`
- Active: green text + 2px green bottom border
- Inactive: muted gray → secondary on hover
- Each tab transition: 150ms ease

---

## 5. Pages

### Home
1. **URL Input** — 48px bar with green focus ring, paste area (supports multiline URL lists showing a count).
2. **Type Badge** — pill showing detected type/count.
3. **Single Video Card** — 160×90 thumbnail + metadata + quality dropdown + Download button.
4. **Playlist/Channel List** — toolbar (Select All, index range inputs, quality, Download N), then table with checkbox, #, thumbnail, title, duration. Sticky header, scrollable, selected rows highlighted with green left border.
5. **Multi URL** — count display + Download All button.

### Queue
- Header with "Clear Completed"
- Queue items: title, quality badge, cancel button; 4px green progress bar with % / speed / ETA text
- States: queued, downloading, completed (green check), error (red border + message)
- Empty state illustration

### History
- Header with "Clear History"
- Items: filename, quality badge, relative time
- Stored in `userData/history.json`, capped at 500 entries

### Settings
- Download Quality (radio: Best/1080p/720p/480p/360p/Audio MP3)
- Download Location (path + Change button using dialog)
- Concurrent Downloads (select: 1–5)
- About section

---

## 6. Buttons

| Variant | Background | Border | Hover |
|---------|-----------|--------|-------|
| Primary | `--accent` | none | `--accent-hover` |
| Secondary | `--bg-elevated` | `--border-default` | `--bg-hover` |
| Ghost | transparent | none | `--bg-hover` |
| Icon | transparent | none | red for cancel |

All: 36px height, 4px radius, 14px/500. Disabled: opacity 0.4.

---

## 7. Animated / Interactive States
- Tab switch: 150ms ease
- Button hover: 100ms ease
- Progress fill: 300ms linear
- Toast: slide-in 250ms cubic-bezier(0.16,1,0.3,1), auto-dismiss 4s
- Input focus: green border + 2px green glow ring
- List row hover/selected: 100ms ease

---

## 8. Scrollbar
6px, transparent track, `--border-default` thumb, `--border-strong` on hover.

---

## 9. Toast Notifications
Bottom-right, min 280px, colored left border (green/red/blue by type), slide-in animation, stack max 3.

---

## 10. IPC Architecture
| Channel | Direction | Purpose |
|---------|-----------|---------|
| `window:minimize/close` | R→M | Window controls |
| `detect-url` | R→M | Detect single/playlist/channel/multi |
| `fetch-playlist` | R→M | List playlist/channel videos |
| `fetch-video-info` | R→M | Single video metadata |
| `start-download` | R→M | Begin yt-dlp download |
| `cancel-download` | R→M | Kill process |
| `download-progress` | M→R | Streamed progress events |
| `download-complete` | M→R | Completion event |
| `download-error` | M→R | Error event |
| `get/save-settings` | R↔M | Settings persistence |
| `get/clear-history` | R↔M | History persistence |
| `choose-directory` | R→M | Folder picker dialog |

---

## 11. yt-dlp Command Patterns

- **Detect type**: `yt-dlp --flat-playlist -j --playlist-items 1:1 "URL"`
- **Fetch playlist**: `yt-dlp --flat-playlist -j "URL"` (JSON lines)
- **Video info**: `yt-dlp -j "URL"`
- **Download**: `yt-dlp -f <format> --newline --no-playlist -o "<dir>/%(title)s.%(ext)s" --ffmpeg-location <ffmpeg> "URL"`
- **Audio**: adds `--extract-audio --audio-format mp3`
- **Progress parse**: regex on `--newline` lines
- **Binaries**: located via `process.resourcesPath` (packaged) or `resources/` (dev)

### Quality Formats
| Preset | Format spec |
|--------|-------------|
| Best | `bestvideo+bestaudio/best` |
| 1080p | `bestvideo[height<=1080]+bestaudio/best[height<=1080]/best` |
| 720p | `bestvideo[height<=720]+bestaudio/best[height<=720]/best` |
| 480p | `bestvideo[height<=480]+bestaudio/best[height<=480]/best` |
| 360p | `bestvideo[height<=360]+bestaudio/best[height<=360]/best` |
| Audio | `bestaudio` |
