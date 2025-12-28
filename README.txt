YJS Upgrade v31 — Gatekeeper controls Inner Chamber phrase + Operator Dock

What this adds:
- gatekeeper.html (NEW/REPLACEMENT): lets you set the Inner Chamber phrase (device-local), plus optional Vault settings.
- inner-chamber.html (PATCHED): phrase now reads from localStorage key yjsInnerPhrase (fallback: VELVET FLAME).
- Operator Dock (PATCHED): on rooms.html, request-entry.html, inner-chamber.html it appears ONLY after Coronation (yjsCoronated=true).

How to use:
1) Unzip
2) Upload/replace in repo root:
   - gatekeeper.html
   - inner-chamber.html
   - rooms.html (optional but recommended)
   - request-entry.html (optional but recommended)
3) Commit
4) On your device, open gatekeeper.html and set your phrase.

Notes:
- This is still static hosting. Settings are per-device.
- If you want shared phrases across devices, we add a backend later.
