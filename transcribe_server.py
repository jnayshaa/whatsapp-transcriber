"""
Whisper Transcription Server
─────────────────────────────
A simple local HTTP server that receives audio files
and returns transcripts using OpenAI Whisper (free, local).

Start this BEFORE running bot.js.
Usage: python transcribe_server.py
"""

import os
import tempfile
import subprocess
from flask import Flask, request, jsonify
import whisper

# ─── CONFIG ──────────────────────────────────────────────────────────────────

PORT = 5050

# Whisper model size — tradeoff between speed and accuracy:
#   tiny   ~75MB  — fastest, good for clear speech
#   base   ~150MB — best balance               ← default
#   small  ~500MB — more accurate, slower
#   medium ~1.5GB — even more accurate
#   large  ~3GB   — most accurate, slow on CPU
WHISPER_MODEL = os.environ.get("WHISPER_MODEL", "base")

# ─── SETUP ───────────────────────────────────────────────────────────────────

app = Flask(__name__)

print(f"Loading Whisper '{WHISPER_MODEL}' model (downloading if first run)...")
model = whisper.load_model(WHISPER_MODEL)
print(f"✅ Whisper model loaded!\n")


# ─── HELPERS ─────────────────────────────────────────────────────────────────

def convert_to_wav(input_path: str, output_path: str):
    """
    Convert any audio format (ogg, mp3, m4a…) to WAV using ffmpeg.
    Whisper works with most formats, but WAV is most reliable.
    """
    subprocess.run(
        [
            "ffmpeg", "-y",
            "-i", input_path,
            "-ar", "16000",     # 16kHz sample rate (Whisper's native rate)
            "-ac", "1",         # Mono channel
            output_path,
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=True,
    )


# ─── ROUTES ──────────────────────────────────────────────────────────────────

@app.route("/transcribe", methods=["POST"])
def transcribe():
    """
    POST /transcribe
    Accepts: multipart/form-data with an 'audio' file field
    Returns: JSON { "transcript": "...", "language": "..." }
    """
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided. Use form field 'audio'."}), 400

    audio_file = request.files["audio"]

    with tempfile.TemporaryDirectory() as tmpdir:
        # Save uploaded file
        original_ext = os.path.splitext(audio_file.filename)[1] or ".ogg"
        input_path = os.path.join(tmpdir, f"input{original_ext}")
        wav_path = os.path.join(tmpdir, "converted.wav")

        audio_file.save(input_path)

        # Convert to WAV
        try:
            convert_to_wav(input_path, wav_path)
        except subprocess.CalledProcessError as e:
            return jsonify({
                "error": "Audio conversion failed. Is ffmpeg installed?",
                "detail": str(e)
            }), 500

        # Transcribe with Whisper
        try:
            result = model.transcribe(wav_path, fp16=False)
            transcript = result.get("text", "").strip()
            language = result.get("language", "unknown")

            print(f"  Transcribed ({language}): {transcript[:80]}{'...' if len(transcript) > 80 else ''}")

            return jsonify({
                "transcript": transcript or "[Audio was silent or unclear]",
                "language": language,
            })

        except Exception as e:
            return jsonify({"error": f"Transcription failed: {str(e)}"}), 500


@app.route("/health", methods=["GET"])
def health():
    """Simple health check endpoint."""
    return jsonify({"status": "ok", "model": WHISPER_MODEL})


# ─── ENTRY POINT ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print(f"🚀 Transcription server running on http://localhost:{PORT}")
    print(f"   Model: Whisper {WHISPER_MODEL}")
    print(f"   Health check: http://localhost:{PORT}/health\n")
    app.run(host="0.0.0.0", port=PORT, debug=False)
