const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // service role
const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadFile(bucket, filePath, fileBuffer) {
    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, fileBuffer, { upsert: true });
    if (error) throw error;
    return data;
}

async function getPublicUrl(bucket, filePath) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
}

module.exports = { supabase, uploadFile, getPublicUrl };
