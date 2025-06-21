import express from 'express';
import ffmpeg from 'fluent-ffmpeg';
import { YtDlp } from 'ytdlp-nodejs';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(helmet(), express.json(), morgan('combined'), rateLimit({ windowMs: 60000, max: 30 }));

const ClipSchema = z.object({
  url: z.string().url(),
  quality: z.number().int().positive().optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).default('00:00:00'),
  duration: z.number().int().positive().max(600).default(10),
  reencode: z.boolean().default(false),
  crf: z.number().int().min(0).max(51).default(18),
  preset: z.string().default('veryfast'),
});

function computeEndTime(start, dur) {
  const [h, m, s] = start.split(':').map(Number);
  const total = h * 3600 + m * 60 + s + dur;
  const H = Math.floor(total / 3600);
  const M = Math.floor((total % 3600) / 60);
  const S = total % 60;
  return [H, M, S].map(v => String(v).padStart(2, '0')).join(':');
}

const OUTPUT_DIR = path.join(process.cwd(), 'clips');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

app.post('/api/clip', async (req, res) => {
  try {
    const { url, quality, startTime, duration, reencode, crf, preset } = ClipSchema.parse(req.body);
    const endTime = computeEndTime(startTime, duration);
    const ytdlp = new YtDlp();
    await ytdlp.checkInstallationAsync({ ffmpeg: false });

    const format = quality
      ? `bestvideo[height<=${quality}]+bestaudio/best[height<=${quality}]`
      : 'bestvideo+bestaudio';

    const ts = Date.now();
    const baseName = `clip_${ts}`;
    const inExt = reencode ? '.mkv' : '.mp4';
    const tmpPath = path.join(OUTPUT_DIR, baseName + inExt);
    const outPath = path.join(OUTPUT_DIR, baseName + '.mp4');

    const dl = ytdlp.exec(url, { format, mergeOutputFormat: reencode ? 'mkv' : 'mp4', downloadSections: [`*${startTime}-${endTime}`], output: tmpPath, stderr: true });
    dl.stderr?.on('data', c => console.error('[yt-dlp]', c.toString()));

    dl.on('close', code => {
      if (code !== 0) return res.status(500).send('Download failed');
      if (!reencode) return res.download(tmpPath, path.basename(outPath));

      ffmpeg(tmpPath)
        .setStartTime('00:00:00')
        .setDuration(duration)
        .outputOptions(['-c:v','libx264','-crf',String(crf),'-preset',preset,'-c:a','aac','-b:a','192k','-movflags','frag_keyframe+faststart'])
        .format('mp4')
        .save(outPath)
        .on('end', () => res.download(outPath, path.basename(outPath)))
        .on('error', () => res.status(500).send('Re-encode failed'));
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));
