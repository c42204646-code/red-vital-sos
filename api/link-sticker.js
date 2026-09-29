module.exports = async function(req, res) {
    // Solo aceptamos peticiones POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { id_sticker, user_id } = req.body;

    if (!id_sticker || !user_id) {
        return res.status(400).json({ error: 'Faltan datos obligatorios (sticker o usuario).' });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return res.status(500).json({ error: 'Faltan llaves de Supabase en Vercel.' });
    }

    try {
        // 1. Verificar si el sticker existe en la tabla qr_stickers
        const getUrl = `${SUPABASE_URL}/rest/v1/qr_stickers?id=eq.${id_sticker}&select=*`;
        const getResponse = await fetch(getUrl, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        const stickerData = await getResponse.json();

        // Validaciones del estado del sticker
        if (!stickerData || stickerData.length === 0) {
            return res.status(404).json({ error: 'La calcomanía no existe en el inventario.' });
        }

        const sticker = stickerData[0];
        
        if (sticker.estado === 'vinculado') {
            return res.status(400).json({ error: 'Esta calcomanía ya se encuentra vinculada a otro usuario.' });
        }

        // 2. Actualizar el sticker en Supabase a 'vinculado' y asignarle el user_id
        const patchUrl = `${SUPABASE_URL}/rest/v1/qr_stickers?id=eq.${id_sticker}`;
        const patchResponse = await fetch(patchUrl, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                estado: 'vinculado',
                user_id: user_id,
                vinculado_at: new Date().toISOString()
            })
        });

        if (!patchResponse.ok) {
            const errText = await patchResponse.text();
            console.error("Fallo actualizando tabla:", errText);
            return res.status(400).json({ error: 'Fallo al actualizar en la base de datos', details: errText });
        }

        return res.status(200).json({ success: true, message: 'Sticker vinculado exitosamente' });

    } catch (error) {
        console.error("Error crítico en vinculación:", error);
        return res.status(500).json({ error: 'Error interno al procesar la vinculación.', details: error.message });
    }
};
