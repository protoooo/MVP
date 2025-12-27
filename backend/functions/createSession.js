const { supabase } = require('../utils/storage');
const { v4: uuidv4 } = require('uuid');

module.exports = async function createSession(req, res) {
    const { user_id, type, area_tags } = req.body;
    const sessionId = uuidv4();

    const { error } = await supabase
        .from('audit_sessions')
        .insert([{ id: sessionId, user_id, type, area_tags }]);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ session_id: sessionId });
};
