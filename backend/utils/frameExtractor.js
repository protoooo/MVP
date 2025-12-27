const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const imageHash = require('image-hash');

async function extractFrames(videoPath, outputDir) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        ffmpeg(videoPath)
            .outputOptions(['-vf fps=1']) // 1 frame/sec
            .save(path.join(outputDir, 'frame_%04d.jpg'))
            .on('end', () => resolve())
            .on('error', (err) => reject(err));
    });
}

async function deduplicateFrames(framePaths) {
    const uniqueFrames = [];
    const hashes = new Set();

    for (const framePath of framePaths) {
        const h = await new Promise((res, rej) => {
            imageHash(framePath, 16, true, (error, data) => {
                if (error) rej(error);
                else res(data);
            });
        });

        if (!hashes.has(h)) {
            hashes.add(h);
            uniqueFrames.push(framePath);
        } else {
            fs.unlinkSync(framePath); // remove duplicate frame
        }
    }

    return uniqueFrames;
}

module.exports = { extractFrames, deduplicateFrames };
