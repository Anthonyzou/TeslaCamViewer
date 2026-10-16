import ffmpeg from 'fluent-ffmpeg';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Export jobs map and temporary directory
export const exportJobs = new Map();
export const EXPORT_DIR = path.join(os.tmpdir(), 'teslacam_exports');
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

export default function registerFfmpegRoutes(app) {
  // 3. Server-Side FFmpeg Video Export Routes
  app.post('/api/export', (req, res) => {
    const {
      eventName,
      camera = 'all',
      format = 'mp4',
      clips,
      inPoint,
      outPoint,
    } = req.body;

    if (!clips || Object.keys(clips).length === 0) {
      return res.status(400).json({ error: 'No clips provided for export' });
    }

    const jobId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const ext = format === 'gif' ? 'gif' : 'mp4';
    const filename = `TeslaCam_${eventName || 'Export'}_${camera}.${ext}`;
    const outputPath = path.join(EXPORT_DIR, `${jobId}.${ext}`);

    const job = {
      id: jobId,
      status: 'encoding',
      percent: 0,
      outputPath,
      filename,
      createdAt: Date.now(),
      error: null,
      command: null,
    };

    exportJobs.set(jobId, job);

    try {
      const cmd = ffmpeg();
      const trimStart =
        Number.isFinite(inPoint) && inPoint > 0 ? inPoint : null;
      const trimDuration =
        Number.isFinite(outPoint) && outPoint > (inPoint || 0)
          ? outPoint - (inPoint || 0)
          : null;

      if (camera !== 'all' && clips[camera]) {
        cmd.input(clips[camera]);
        if (trimStart !== null) cmd.seekInput(trimStart);
        if (trimDuration !== null) cmd.setDuration(trimDuration);

        if (format === 'gif') {
          cmd.complexFilter([
            'fps=15,scale=640:-1:flags=lanczos,split[s0][s1]',
            '[s0]palettegen[p]',
            '[s1][p]paletteuse',
          ]);
        } else {
          cmd
            .videoCodec('libx264')
            .outputOptions([
              '-preset fast',
              '-crf 22',
              '-pix_fmt yuv420p',
              '-movflags +faststart',
            ]);
        }
      } else {
        const is6Cam = !!(clips.left_pillar && clips.right_pillar);
        const cameraOrder = is6Cam
          ? [
              'left_pillar',
              'front',
              'right_pillar',
              'left_repeater',
              'back',
              'right_repeater',
            ]
          : ['front', 'back', 'left_repeater', 'right_repeater'];
        const activeCameras = cameraOrder.filter((c) => !!clips[c]);

        if (activeCameras.length === 0) {
          Object.keys(clips).forEach((c) => activeCameras.push(c));
        }

        activeCameras.forEach((cam) => {
          cmd.input(clips[cam]);
          if (trimStart !== null) {
            cmd.seekInput(trimStart);
          }
        });

        if (trimDuration !== null) cmd.setDuration(trimDuration);

        let filterChain;
        if (activeCameras.length === 6) {
          filterChain = [
            '[0:v]scale=640:360[v0]',
            '[1:v]scale=640:360[v1]',
            '[2:v]scale=640:360[v2]',
            '[3:v]scale=640:360[v3]',
            '[4:v]scale=640:360[v4]',
            '[5:v]scale=640:360[v5]',
            '[v0][v1][v2]hstack=inputs=3[top]',
            '[v3][v4][v5]hstack=inputs=3[bottom]',
            '[top][bottom]vstack=inputs=2[v]',
          ];
        } else if (activeCameras.length === 4) {
          filterChain = [
            '[0:v]scale=960:540[v0]',
            '[1:v]scale=960:540[v1]',
            '[2:v]scale=960:540[v2]',
            '[3:v]scale=960:540[v3]',
            '[v0][v1]hstack=inputs=2[top]',
            '[v2][v3]hstack=inputs=2[bottom]',
            '[top][bottom]vstack=inputs=2[v]',
          ];
        } else if (activeCameras.length === 3) {
          filterChain = [
            '[0:v]scale=1920:540[top]',
            '[1:v]scale=960:540[b1]',
            '[2:v]scale=960:540[b2]',
            '[b1][b2]hstack=inputs=2[bottom]',
            '[top][bottom]vstack=inputs=2[v]',
          ];
        } else if (activeCameras.length === 2) {
          filterChain = [
            '[0:v]scale=960:540[v0]',
            '[1:v]scale=960:540[v1]',
            '[v0][v1]hstack=inputs=2[v]',
          ];
        } else {
          filterChain = ['[0:v]scale=1280:720[v]'];
        }

        if (format === 'gif') {
          filterChain.push(
            '[v]fps=12,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse'
          );
        } else {
          cmd
            .videoCodec('libx264')
            .outputOptions([
              '-map [v]',
              '-preset fast',
              '-crf 22',
              '-pix_fmt yuv420p',
              '-movflags +faststart',
            ]);
        }

        cmd.complexFilter(filterChain);
      }

      cmd.output(outputPath);

      cmd.on('progress', (progress) => {
        if (progress.percent) {
          job.percent = Math.min(
            100,
            Math.max(0, Math.round(progress.percent))
          );
        }
      });

      cmd.on('end', () => {
        try {
          const stats = fs.statSync(outputPath);
          if (stats.size < 1000) {
            job.status = 'error';
            job.error = 'Export produced an empty video file';
            console.error(
              `[Export] Job ${jobId} produced empty file (${stats.size} bytes): ${outputPath}`
            );
            return;
          }
        } catch (e) {
          job.status = 'error';
          job.error = 'Export failed to produce output file';
          return;
        }
        job.status = 'completed';
        job.percent = 100;
        console.log(`[Export] Job ${jobId} completed: ${outputPath}`);
      });

      cmd.on('error', (err) => {
        if (job.status !== 'cancelled') {
          job.status = 'error';
          job.error = err.message;
          console.error(`[Export] Job ${jobId} error:`, err.message);
        }
      });

      job.command = cmd;
      cmd.run();

      res.json({ jobId, status: 'encoding' });
    } catch (err) {
      job.status = 'error';
      job.error = err.message;
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/export/status/:jobId', (req, res) => {
    const job = exportJobs.get(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Export job not found' });
    }
    res.json({
      id: job.id,
      status: job.status,
      percent: job.percent,
      error: job.error,
      filename: job.filename,
    });
  });

  app.get('/api/export/download/:jobId', (req, res) => {
    const job = exportJobs.get(req.params.jobId);
    if (!job || job.status !== 'completed' || !fs.existsSync(job.outputPath)) {
      return res
        .status(404)
        .json({ error: 'Export file not found or not yet complete' });
    }
    res.download(job.outputPath, job.filename);
  });

  app.post('/api/export/cancel/:jobId', (req, res) => {
    const job = exportJobs.get(req.params.jobId);
    if (job) {
      job.status = 'cancelled';
      if (job.command) {
        try {
          job.command.kill('SIGKILL');
        } catch (e) {}
      }
      if (job.outputPath && fs.existsSync(job.outputPath)) {
        try {
          fs.unlinkSync(job.outputPath);
        } catch (e) {}
      }
    }
    res.json({ success: true });
  });
}
