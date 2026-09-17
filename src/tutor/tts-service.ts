import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import logger from '../utils/logger.js';

export interface VoiceOption {
  id: string;
  name: string;
  gender: 'male' | 'female';
  language: string;
  locale: string;
  accent: string;
  isDefault?: boolean;
}

export const AVAILABLE_VOICES: VoiceOption[] = [
  // English Voices
  {
    id: 'en-US-ChristopherNeural',
    name: 'Christopher (Warm Tutor)',
    gender: 'male',
    language: 'English',
    locale: 'en-US',
    accent: 'American',
    isDefault: true,
  },
  {
    id: 'en-US-JennyNeural',
    name: 'Jenny (Clear Teacher)',
    gender: 'female',
    language: 'English',
    locale: 'en-US',
    accent: 'American',
  },
  {
    id: 'en-US-GuyNeural',
    name: 'Guy (Conversational)',
    gender: 'male',
    language: 'English',
    locale: 'en-US',
    accent: 'American',
  },
  {
    id: 'en-US-AriaNeural',
    name: 'Aria (Expressive)',
    gender: 'female',
    language: 'English',
    locale: 'en-US',
    accent: 'American',
  },
  {
    id: 'en-GB-RyanNeural',
    name: 'Ryan (British English)',
    gender: 'male',
    language: 'English',
    locale: 'en-GB',
    accent: 'British',
  },
  {
    id: 'en-GB-SoniaNeural',
    name: 'Sonia (British English)',
    gender: 'female',
    language: 'English',
    locale: 'en-GB',
    accent: 'British',
  },

  // Urdu Voices
  {
    id: 'ur-PK-UzmaNeural',
    name: 'Uzma (Urdu)',
    gender: 'female',
    language: 'Urdu',
    locale: 'ur-PK',
    accent: 'Pakistani Urdu',
  },
  {
    id: 'ur-PK-AsadNeural',
    name: 'Asad (Urdu)',
    gender: 'male',
    language: 'Urdu',
    locale: 'ur-PK',
    accent: 'Pakistani Urdu',
  },
  {
    id: 'ur-IN-GulNeural',
    name: 'Gul (Urdu)',
    gender: 'female',
    language: 'Urdu',
    locale: 'ur-IN',
    accent: 'Indian Urdu',
  },
  {
    id: 'ur-IN-SalmanNeural',
    name: 'Salman (Urdu)',
    gender: 'male',
    language: 'Urdu',
    locale: 'ur-IN',
    accent: 'Indian Urdu',
  },
];

// In-memory cache for audio buffers (max 100 entries, ~15MB)
const audioCache = new Map<string, Buffer>();
const MAX_CACHE_SIZE = 100;

function getCacheKey(text: string, voice: string, rate?: string, pitch?: string): string {
  const hash = crypto.createHash('sha256').update(`${text}_${voice}_${rate || ''}_${pitch || ''}`).digest('hex');
  return hash;
}

export async function synthesizeSpeech(
  text: string,
  voice: string = 'en-US-ChristopherNeural',
  rate: string = '+0%',
  pitch: string = '+0Hz'
): Promise<Buffer> {
  const cleanText = text
    .replace(/[#*_`~]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();

  if (!cleanText) {
    throw new Error('No text to synthesize');
  }

  const cacheKey = getCacheKey(cleanText, voice, rate, pitch);
  if (audioCache.has(cacheKey)) {
    return audioCache.get(cacheKey)!;
  }

  const tempDir = os.tmpdir();
  const tempFile = path.join(tempDir, `tts_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`);
  const workerScript = path.resolve(process.cwd(), 'scripts', 'tts_worker.py');

  return new Promise((resolve, reject) => {
    const pythonExe = process.platform === 'win32' ? 'python' : 'python3';
    const proc = spawn(pythonExe, [workerScript, tempFile, voice, rate, pitch], {
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
      },
    });

    let stderr = '';

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', async (code) => {
      if (code !== 0) {
        logger.error('TTS generation failed', { code, stderr });
        if (fs.existsSync(tempFile)) {
          try { fs.unlinkSync(tempFile); } catch (_) {}
        }
        return reject(new Error(`TTS generation exited with code ${code}: ${stderr}`));
      }

      try {
        if (!fs.existsSync(tempFile)) {
          return reject(new Error('TTS worker completed but output audio file was not found'));
        }
        const audioBuffer = fs.readFileSync(tempFile);
        try { fs.unlinkSync(tempFile); } catch (_) {}

        // Cache result
        if (audioCache.size >= MAX_CACHE_SIZE) {
          const firstKey = audioCache.keys().next().value;
          if (firstKey) audioCache.delete(firstKey);
        }
        audioCache.set(cacheKey, audioBuffer);

        resolve(audioBuffer);
      } catch (readErr) {
        reject(readErr);
      }
    });

    proc.on('error', (err) => {
      logger.error('Failed to spawn Python TTS process', { error: err.message });
      reject(err);
    });

    // Write text to worker stdin
    proc.stdin.write(cleanText, 'utf8');
    proc.stdin.end();
  });
}
