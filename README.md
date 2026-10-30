# 🌐 Global VR Modded APK Inspector & Autonomous AI Studio

A multi-user VR Modded APK scanner, global shared scan memory database, offline VR intelligence engine, and community feedback review system designed for deployment on Render.

## 🚀 Key Features

1. **Native Binary APK Inspection (`.so` Extractor)**
   - Unpacks `.apk` files directly in the browser using `JSZip`.
   - Filters vanilla Unity / Oculus / OpenXR libraries against custom modded native binaries (`libquest-hook.so`, `libmelonloader.so`, etc.).

2. **Dual AI Modder Engine**
   - **⚡ Built-In Offline VR AI:** Works out of the box with zero setup or API keys required. Generates C++/C# hooks, searches offline database knowledge, and compares scans.
   - **🌐 OpenAI GPT-4o Integration:** Optional mode for advanced deep LLM code synthesis and automated patching.

3. **Global Shared Scan Database**
   - Centralized memory hosted on Node.js/Express (`server.js`).
   - Every uploaded APK automatically feeds into a global network index shared across all users.

4. **Community Feedback & Review Loop**
   - Users can rate mods (1-5 stars), log crash reports, and tag working statuses (`Working`, `Crashes on Launch`, `Flagged`).

## 🛠️ Project Structure

```text
VR-Modded-APK-Studio/
├── index.html                  # Frontend GUI, JSZip Inspector, Offline AI & Review Panel
├── server.js                   # Express Server, REST API, Persistent JSON DB
├── package.json                # Node.js Dependencies & Start Scripts
├── render.yaml                 # Automatic Render Deployment Configuration
├── vr-mod-knowledge-base.json  # Offline AI Modding Snippets & Reverse Engineering Rules
└── README.md                   # Project Documentation
