/**
 * WhatsApp Voice Note Transcriber
 * ─────────────────────────────────
 * Uses whatsapp-web.js to listen for voice notes,
 * downloads the audio, sends it to a local Python
 * Whisper server, and replies with the transcript.
 *
 * Setup: See README.md
 */

const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");
const os = require("os");
const FormData = require("form-data");
const fetch = require("node-fetch");

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const TRANSCRIPTION_SERVER_URL = "http://localhost:5050/transcribe";

// Emoji prefix and suffix for replies
const REPLY_PREFIX = "📝 *Transcript:*\n\n";
const REPLY_SUFFIX = "\n\n_🤖 Whisper AI (free & local)_";

// Set to true to also transcribe voice notes YOU send
const TRANSCRIBE_OWN_MESSAGES = false;

// ─── WHATSAPP CLIENT ─────────────────────────────────────────────────────────

const client = new Client({
  authStrategy: new LocalAuth(), // Saves session so you don't re-scan QR every time
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

// Show QR code in terminal for first-time login
client.on("qr", (qr) => {
  console.log("\n📱 Scan this QR code with your WhatsApp:");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("\n✅ WhatsApp connected! Listening for voice notes...");
  console.log("   Leave this terminal running in the background.\n");
});

client.on("auth_failure", (msg) => {
  console.error("❌ Authentication failed:", msg);
  console.log("   Delete the .wwebjs_auth folder and restart to re-scan QR.");
});

client.on("disconnected", (reason) => {
  console.warn("⚠️  Disconnected:", reason);
  console.log("   Restarting in 5 seconds...");
  setTimeout(() => client.initialize(), 5000);
});

// ─── MESSAGE HANDLER ─────────────────────────────────────────────────────────

client.on("message_create", async (message) => {
  // Only process voice notes / audio
  const isVoiceNote =
    message.type === "ptt" || // ptt = Push To Talk (voice note)
    message.type === "audio";

  if (!isVoiceNote) return;

  // Skip own messages unless configured
  if (message.fromMe && !TRANSCRIBE_OWN_MESSAGES) return;

  const contact = await message.getContact();
  const senderName = contact.pushname || contact.number || "Unknown";
  console.log(`\n🎙️  Voice note from: ${senderName}`);

  try {
    // 1. Download the audio media
    console.log("  → Downloading audio...");
    const media = await message.downloadMedia();

    if (!media || !media.data) {
      throw new Error("Could not download audio from WhatsApp");
    }

    // 2. Save to a temp file
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `wa_voice_${Date.now()}.ogg`);
    fs.writeFileSync(tmpFile, Buffer.from(media.data, "base64"));
    console.log(`  → Saved to temp file: ${tmpFile}`);

    // 3. Send to Python transcription server
    console.log("  → Sending to Whisper for transcription...");
    const transcript = await transcribeFile(tmpFile);

    // 4. Clean up temp file
    fs.unlinkSync(tmpFile);

    // 5. Reply with transcript
    const replyText = `${REPLY_PREFIX}${transcript}${REPLY_SUFFIX}`;
    await message.reply(replyText);
    console.log(`  ✅ Replied with transcript (${transcript.length} chars)`);

  } catch (err) {
    console.error("  ❌ Error:", err.message);

    // // 5. Print transcript to terminal (no reply sent)
    // console.log(`\n📝 Transcript: ${transcript}\n`);

    // Give a friendly error reply so the user knows something went wrong
    await message.reply(
      `❌ Could not transcribe this voice note.\n_Error: ${err.message}_`
    );
  }
});

// ─── TRANSCRIPTION CALL ──────────────────────────────────────────────────────

async function transcribeFile(filePath) {
  const form = new FormData();
  form.append("audio", fs.createReadStream(filePath));

  const response = await fetch(TRANSCRIPTION_SERVER_URL, {
    method: "POST",
    body: form,
    headers: form.getHeaders(),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Transcription server error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.transcript || "[No transcript returned]";
}

// ─── START ───────────────────────────────────────────────────────────────────

console.log("=" .repeat(50));
console.log("  WhatsApp Voice Note Transcriber");
console.log("=" .repeat(50));
console.log("\n⚙️  Starting WhatsApp Web client...");
console.log("   Make sure transcribe_server.py is running first!\n");

client.initialize();
