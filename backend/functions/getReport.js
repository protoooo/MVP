const { supabase } = require('../utils/storage');

module.exports = async function getReport(req, res) {
    const { session_id } = req.params;
    const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('session_id', session_id)
        .single();

    if (error) return res.status(404).json({ error: error.message });
    res.json({ report: data.json_report, pdf_url: data.pdf_url });
};
