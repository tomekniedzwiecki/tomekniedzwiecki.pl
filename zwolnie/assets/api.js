/* =====================================================
   ZWOLNIE ETATY - API client (Supabase tn-crm)
   Zapisuje brief z /zwolnie/ do public.zwolnie_leads
   + zalaczniki do bucketu `zwolnie-attachments`
   + Slack notyfikacja na kanal #zwolnie_lead (slack-notify edge function)
   ===================================================== */

const SUPABASE_URL = 'https://yxmavwkwnfuphjqbelws.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_vT94u2GI4gzYl8gCV5sHbQ_Q94YidaI';
const STORAGE_BUCKET = 'zwolnie-attachments';

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

async function sendSlackNotification(payload) {
    try {
        await fetch(`${SUPABASE_URL}/functions/v1/slack-notify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ type: 'zwolnie_lead', data: payload })
        });
    } catch (err) {
        console.error('Slack notification error:', err);
    }
}

// --- Leads ---
const Leads = {
    async create(data) {
        // Klient generuje UUID, dzieki czemu nie potrzeba SELECT po INSERT (anon nie ma SELECT na zwolnie_leads).
        const leadId = (crypto && crypto.randomUUID) ? crypto.randomUUID() : null;
        if (!leadId) {
            throw new Error('Twoja przeglądarka nie obsługuje wymaganej funkcji (crypto.randomUUID). Zaktualizuj przeglądarkę.');
        }

        const attachments = data.attachments || [];
        const leadPayload = {
            id: leadId,
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

        const { error } = await sb.from('zwolnie_leads').insert(leadPayload);
        if (error) {
            console.error('Lead insert failed:', error);
            throw error;
        }

        // Upload zalacznikow — sledz failures zeby pokazac w UI
        const failed = [];
        let uploaded = 0;
        for (const a of attachments) {
            try {
                const blob = a.data ? dataUrlToBlob(a.data) : null;
                if (!blob) { failed.push(a.name); continue; }
                const safeName = sanitizeFileName(a.name);
                const unique = Date.now() + '_' + Math.random().toString(36).slice(2, 8);
                const path = `leads/${leadId}/${unique}_${safeName}`;
                const { error: upErr } = await sb.storage
                    .from(STORAGE_BUCKET)
                    .upload(path, blob, { contentType: a.type, upsert: false });
                if (upErr) {
                    console.error('Attachment upload failed:', a.name, upErr);
                    failed.push(a.name);
                    continue;
                }
                const { error: rowErr } = await sb.from('zwolnie_lead_attachments').insert({
                    lead_id: leadId,
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

        // Slack — fire and forget (nie blokuj UI gdyby Slack padl)
        sendSlackNotification({
            lead_id: leadId,
            contact_name: leadPayload.contact_name,
            contact_email: leadPayload.contact_email,
            contact_phone: leadPayload.contact_phone,
            company: leadPayload.company,
            website: leadPayload.website,
            industry: leadPayload.industry,
            team_size: leadPayload.team_size,
            payroll: leadPayload.payroll,
            budget: leadPayload.budget,
            problem: leadPayload.problem,
            attachments_total: attachments.length,
            attachments_uploaded: uploaded
        });

        return {
            id: leadId,
            attachments_total: attachments.length,
            attachments_uploaded: uploaded,
            attachments_failed: failed
        };
    }
};

// expose
window.Leads = Leads;
