const { uploadFile, supabase } = require('../utils/storage');
const { v4: uuidv4 } = require('uuid');

module.exports = async function uploadMedia(req, res) {
    const { session_id, type } = req.body;
    const file = req.files.file; // multer or similar
    const mediaId = uuidv4();
    const filePath = `media/${session_id}/${mediaId}_${file.name}`;

    await uploadFile('media-bucket', filePath, file.data);

    await supabase.from('media').insert([{
        id: mediaId,
        session_id,
        type,
        url: filePath
    }]);

    res.json({ media_id: mediaId, url: filePath });
};
