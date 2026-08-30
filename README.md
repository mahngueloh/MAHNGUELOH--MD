# MAHNGUELOH-MD 🤖

A public WhatsApp bot built with Baileys.

---

## 🚀 Setup on Panel

### 1. Install dependencies
```bash
npm install
pip install yt-dlp
```

### 2. Start the bot
```bash
node index.js
```

---

## ⚙️ Configuration (`config.js`)

| Setting | Description |
|---|---|
| `ownerNumber` | Your number without + (already set: 254732223354) |
| `mode` | `'public'` = everyone uses bot · `'private'` = owner only |
| `sudoNumbers` | Extra numbers with owner-level access e.g. `['254711111111']` |
| `openaiApiKey` | Optional — paste OpenAI key for GPT responses |
| `geminiApiKey` | Optional — paste Google Gemini key for free AI |
| `prefix` | Command prefix, default is `.` |

---

## 📋 Commands

| Command | Description | Who can use |
|---|---|---|
| `.menu` / `.help` | Show all commands | Everyone |
| `.ping` | Check bot speed | Everyone |
| `.owner` | Show owner info | Everyone |
| `.runtime` | Bot uptime | Everyone |
| `.sticker` / `.s` | Make sticker from image/video | Everyone (public mode) |
| `.ai` / `.ask` / `.gpt` | Ask AI a question | Everyone (public mode) |
| `.yt` / `.ytmp3` | Download YouTube audio | Everyone (public mode) |
| `.ytmp4` | Download YouTube video | Everyone (public mode) |
| `.tiktok` / `.tt` | Download TikTok video | Everyone (public mode) |
| `.ig` | Download Instagram video | Everyone (public mode) |
| `.kick` | Kick a member (reply/mention) | Group admins |
| `.add <number>` | Add member to group | Group admins |
| `.promote` | Promote to admin | Group admins |
| `.demote` | Demote from admin | Group admins |
| `.mute` | Mute group (admins only) | Group admins |
| `.unmute` | Unmute group | Group admins |
| `.mode public/private` | Toggle bot mode | Owner only |

---

## 🔧 Requirements

- Node.js 18+
- `yt-dlp` installed (`pip install yt-dlp`) for download commands
- Bot must be group admin for group management commands

---

## 💡 Tips

- **AI works without a key** — a fallback message is shown until you add a Gemini/OpenAI key
- **Public mode** means everyone in any chat can use commands
- **Add sudo users** in `config.js` to give trusted people owner-level access
- If downloads fail, run: `pip install -U yt-dlp`
