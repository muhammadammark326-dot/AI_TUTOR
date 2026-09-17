import sys
import os
import json
import asyncio
import edge_tts

# Default available neural voices
VOICES = {
    'en-male-1': 'en-US-ChristopherNeural',
    'en-male-2': 'en-US-GuyNeural',
    'en-female-1': 'en-US-JennyNeural',
    'en-female-2': 'en-US-AriaNeural',
    'ur-male-1': 'ur-PK-AsadNeural',
    'ur-male-2': 'ur-IN-SalmanNeural',
    'ur-female-1': 'ur-PK-UzmaNeural',
    'ur-female-2': 'ur-IN-GulNeural',
}

async def generate_speech(text: str, voice_name: str, rate: str = "+0%", pitch: str = "+0Hz"):
    resolved_voice = VOICES.get(voice_name, voice_name)
    communicate = edge_tts.Communicate(text, resolved_voice, rate=rate, pitch=pitch)
    audio_data = bytearray()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data.extend(chunk["data"])
    return audio_data

def main():
    # Ensure UTF-8 I/O on all platforms, especially Windows where default is cp1252
    if hasattr(sys.stdin, 'reconfigure'):
        sys.stdin.reconfigure(encoding='utf-8', errors='replace')
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')

    if len(sys.argv) < 2:
        print("Usage: python tts_worker.py <output_path> [voice] [rate] [pitch]", file=sys.stderr)
        sys.exit(1)

    out_path = sys.argv[1]
    voice = sys.argv[2] if len(sys.argv) > 2 else 'en-US-ChristopherNeural'
    rate = sys.argv[3] if len(sys.argv) > 3 else '+0%'
    pitch = sys.argv[4] if len(sys.argv) > 4 else '+0Hz'

    text = sys.stdin.read().strip()
    if not text:
        print("No text provided via stdin", file=sys.stderr)
        sys.exit(1)

    try:
        audio = asyncio.run(generate_speech(text, voice, rate, pitch))
        with open(out_path, 'wb') as f:
            f.write(audio)
        print(f"OK:{len(audio)}")
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        sys.exit(2)

if __name__ == '__main__':
    main()
