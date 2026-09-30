import { createClient } from '@supabase/supabase-js';

// Conexión corregida
const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { id_sticker } = req.body;

    if (!id_sticker) {
        return res.status(400).json({ error: 'Falta el código de la calcomanía.' });
    }

    try {
        const { data: sticker, error } = await supabase
            .from('qr_stickers')
            .select('user_id, estado')
            .eq('id', id_sticker)
            .single();

        if (error || !sticker) {
            return res.status(404).json({ error: 'Sticker no encontrado' });
        }

        if (sticker.estado !== 'vinculado' || !sticker.user_id) {
            return res.status(400).json({ error: 'Esta calcomanía aún no ha sido vinculada.' });
        }

        return res.status(200).json({ success: true, user_id: sticker.user_id });

    } catch (err) {
        return res.status(500).json({ error: 'Error del servidor al verificar el código.' });
    }
}
