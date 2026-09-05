# YT Downloader — custom NSIS hooks for the assisted installer.
# electron-builder calls these macros when they are defined; keep this file minimal.
# Resulting flow is 2 clicks: [Install] on the files page, [Finish] on the finish page.

# Theme the install progress page to match the app: green bar on white.
# (InstallColors is a compile-time attribute, so it lives at top level.)
InstallColors 22C55E FFFFFF

# Force per-user installs and skip the redundant "all users or current user" page.
# This app only ever installs per-user, so the question (and its UAC detour) is skipped.
!macro customInstallMode
  StrCpy $isForceCurrentInstall "1"
!macroend
