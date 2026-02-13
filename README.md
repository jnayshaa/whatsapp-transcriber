# 🎙️ WhatsApp Voice Note Transcriber

Automatically transcribes WhatsApp voice notes and replies with the text — using **OpenAI Whisper** running locally on your machine. **100% free, no API keys needed.**

---

## How It Works

```
Someone sends a voice note
        ↓
bot.js (Node.js) receives it via WhatsApp Web
        ↓
Audio downloaded & sent to transcribe_server.py
        ↓
Whisper AI transcribes it (locally, free)
        ↓
Bot replies with the transcript
```

---

## Prerequisites

Install these before starting:

### 1. Node.js (v18+)
```bash
# Check if installed
node --version

# Install from https://nodejs.org if needed
```

### 2. Python (3.8+)
```bash
# Check if installed
python --version
```

### 3. ffmpeg (for audio conversion)
```bash
# macOS
brew install ffmpeg

# Ubuntu / Debian
sudo apt install ffmpeg

# Windows: Download from https://ffmpeg.org/download.html
# and add to your PATH
```

---

## Installation

### Step 1 — Install Node.js dependencies
```bash
npm install
```

### Step 2 — Install Python dependencies
```bash
pip install -r requirements.txt
```
> ⚠️ The first run will download the Whisper model (~150MB for "base").
> This only happens once and is cached locally.

---

## Running the Bot

You need **two terminals** running at the same time.

### Terminal 1 — Start the transcription server
```bash
python transcribe_server.py
```
You should see:
```
Loading Whisper 'base' model...
✅ Whisper model loaded!
🚀 Transcription server running on http://localhost:5050
```

### Terminal 2 — Start the WhatsApp bot
```bash
node bot.js
```

On **first run**, a QR code will appear in your terminal. Open WhatsApp on your phone:
- Tap ⋮ (Android) or Settings (iPhone)
- Tap "Linked Devices"
- Tap "Link a Device"
- Scan the QR code

After scanning, your session is saved — you won't need to scan again unless you log out.

---

## Configuration

Edit the top of `bot.js` to change behaviour:

```javascript
const TRANSCRIBE_OWN_MESSAGES = false;  // Set true to also transcribe your own voice notes
const REPLY_PREFIX = "📝 *Transcript:*\n\n";  // Change the reply format
```

Edit the top of `transcribe_server.py` to change the Whisper model:

```python
WHISPER_MODEL = "base"   # Options: tiny, base, small, medium, large
```

| Model  | Size  | Speed  | Accuracy |
|--------|-------|--------|----------|
| tiny   | 75MB  | ⚡⚡⚡⚡ | ★★☆☆☆   |
| base   | 150MB | ⚡⚡⚡  | ★★★☆☆   | ← Recommended
| small  | 500MB | ⚡⚡   | ★★★★☆   |
| medium | 1.5GB | ⚡    | ★★★★☆   |
| large  | 3GB   | 🐢   | ★★★★★   |

Or set via environment variable:
```bash
WHISPER_MODEL=small python transcribe_server.py
```

---

## Example Output

When someone sends you a 30-second voice note, the bot replies:

> 📝 **Transcript:**
>
> Hey, just wanted to remind you about the meeting tomorrow at 3pm. Can you bring the projector? Also Sarah mentioned she might be a few minutes late. Let me know if you have any questions!
>
> *🤖 Whisper AI (free & local)*

---

## Troubleshooting

**"Error: Cannot find module 'whatsapp-web.js'"**
→ Run `npm install`

**"ffmpeg not found"**
→ Install ffmpeg (see Prerequisites above)

**QR code not showing / auth fails**
→ Delete the `.wwebjs_auth` folder and restart `node bot.js`

**Transcription is slow**
→ Switch to `tiny` model in `transcribe_server.py`. On CPU, `base` takes ~10-30 seconds for a 1-minute clip.

**Bot stops working after a while**
→ WhatsApp Web sessions can disconnect. The bot auto-reconnects, but you may need to re-scan QR once.

---

## Running in Background (Optional)

To keep the bot running after you close your terminal:

```bash
# Install pm2 process manager
npm install -g pm2

# Start both processes
pm2 start transcribe_server.py --interpreter python3 --name whisper-server
pm2 start bot.js --name whatsapp-bot

# View logs
pm2 logs

# Stop everything
pm2 stop all
```

---

## ⚠️ Important Notes

- This tool uses **whatsapp-web.js**, which automates WhatsApp Web. This is against WhatsApp's Terms of Service for commercial use. Use it for **personal productivity only**.
- Your messages are processed **entirely on your machine** — no data is sent to any external server.
- The Whisper model runs locally, so transcription quality depends on your computer's CPU/GPU.

---

## File Structure

```
whatsapp_transcriber/
├── bot.js                 ← WhatsApp bot (Node.js)
├── transcribe_server.py   ← Whisper transcription server (Python)
├── package.json           ← Node.js dependencies
├── requirements.txt       ← Python dependencies
└── README.md              ← This file
```
