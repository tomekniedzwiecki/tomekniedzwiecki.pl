/* =====================================================
   ZWOLNIE ETATY - API client (Supabase)
   Sends briefs from /zwolnie/ form to ze_leads + storage.
   ===================================================== */

const SUPABASE_URL = 'https://tahusvkrzaijcywuivle.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhaHVzdmtyemFpamN5d3VpdmxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMDUyNTIsImV4cCI6MjA5NDY4MTI1Mn0.bPE5ct_Lt2w8gY_8lL6hZpKyMS7fJWp37qpLPFFLSR0';
const STORAGE_BUCKET = 'ze-attachments';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
});

// --- helpers ---
function sanitizeFileName(name) {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
}

function dataUrlToBlob(dataUrl) {
    const [meta, b64] = dataUrl.split(',');
    const mime = (meta.match(/data:([^;]+)/) || [])[1] || 'application/octet-stream';
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
}

// --- Leads ---
const Leads = {
    async create(data) {
        const attachments = data.attachments || [];
        const leadPayload = {
            source: 'zwolnie_form',
            status: 'new',
            contact_name: data.contact_name || null,
            contact_email: data.contact_email || null,
            contact_phone: data.contact_phone || null,
            company: data.company || null,
            website: data.website || null,
            industry: data.industry || null,
            team_size: data.team_size || null,
            payroll: data.payroll || null,
            budget: data.budget || null,
            problem: data.problem || null
        };

        const { data: lead, error } = await sb
            .from('ze_leads')
            .insert(leadPayload)
            .select('id, token')
            .single();

        if (error) {
            console.error('Lead insert failed:', error);
            throw error;
        }

        // Upload attachments — śledź failures żeby wyświetlić w UI
        const failed = [];
        let uploaded = 0;
        for (const a of attachments) {
            try {
                const blob = a.data ? dataUrlToBlob(a.data) : null;
                if (!blob) { failed.push(a.name); continue; }
                const safeName = sanitizeFileName(a.name);
                const unique = Date.now() + '_' + Math.random().toString(36).slice(2, 8);
                const path = `leads/${lead.id}/${unique}_${safeName}`;
                const { error: upErr } = await sb.storage
                    .from(STORAGE_BUCKET)
                    .upload(path, blob, { contentType: a.type, upsert: false });
                if (upErr) {
                    console.error('Attachment upload failed:', a.name, upErr);
                    failed.push(a.name);
                    continue;
                }
                const { error: rowErr } = await sb.from('ze_lead_attachments').insert({
                    lead_id: lead.id,
                    file_name: a.name,
                    file_type: a.type || null,
                    file_size: a.size || null,
                    storage_path: path,
                    uploaded_by_role: 'anon'
                });
                if (rowErr) {
                    console.error('Attachment row insert failed:', a.name, rowErr);
                    failed.push(a.name);
                    continue;
                }
                uploaded++;
            } catch (e) {
                console.error('Attachment processing failed:', a.name, e);
                failed.push(a.name);
            }
        }

        return { ...lead, attachments_total: attachments.length, attachments_uploaded: uploaded, attachments_failed: failed };
    }
};

// expose
window.Leads = Leads;
