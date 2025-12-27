const fs = require('fs');
const path = require('path');
const { supabase } = require('../utils/storage');
const { extractFrames, deduplicateFrames } = require('../utils/frameExtractor');
const { analyzeImage } = require('../utils/aiAnalysis');
const { generateReport } = require('../utils/reportGenerator');

module.exports = async function processSession(req, res) {
    const { session_id } = req.params;

    // 1. Fetch media for session
    const { data: mediaList } = await supabase
        .from('media')
        .select('*')
        .eq('session_id', session_id);

    const allResults = [];

    for (const media of mediaList) {
        if (media.type === 'image') {
            const result = await analyzeImage(media.url);
            result.media_id = media.id;
            allResults.push(result);

            await supabase.from('compliance_results').insert([{
                session_id,
                media_id: media.id,
                ...result
            }]);

        } else if (media.type === 'video') {
            const videoPath = path.join('/tmp', path.basename(media.url));
            // download from Supabase Storage to /tmp if needed
            const frameDir = path.join('/tmp', `${media.id}_frames`);
            await extractFrames(videoPath, frameDir);

            const frames = fs.readdirSync(frameDir).map(f => path.join(frameDir, f));
            const uniqueFrames = await deduplicateFrames(frames);

            for (const framePath of uniqueFrames) {
                const result = await analyzeImage(framePath);
                result.media_id = media.id;
                allResults.push(result);

                await supabase.from('compliance_results').insert([{
                    session_id,
                    media_id: media.id,
                    ...result
                }]);
            }
        }
    }

    // Generate report
    const { jsonReport, pdfPath } = generateReport(session_id, allResults);

    await supabase.from('reports').insert([{
        session_id,
        json_report: jsonReport,
        pdf_url: pdfPath
    }]);

    res.json({ status: 'complete', report: jsonReport });
};
