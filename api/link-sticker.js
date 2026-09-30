// api/link-sticker.js
import { createClient } from '@supabase/supabase-js';

// Conexión a prueba de balas
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { id_sticker, user_id } = req.body;

    if (!id_sticker || !user_id) {
        return res.status(400).json({ error: 'Faltan datos obligatorios.' });
    }

    try {
        // 1. Verificar si el sticker existe
        const { data: sticker, error: fetchError } = await supabase
            .from('qr_stickers')
            .select('*')
            .eq('id', id_sticker)
            .single();

        if (fetchError || !sticker) {
            return res.status(404).json({ error: 'El código de calcomanía no existe en el inventario.' });
        }

        if (sticker.estado === 'vinculado') {
            return res.status(400).json({ error: 'Esta calcomanía ya se encuentra vinculada.' });
        }

        // 2. Actualizar el estado a vinculado
        const { error: updateError } = await supabase
            .from('qr_stickers')
            .update({ 
                estado: 'vinculado', 
                user_id: user_id,
                vinculado_at: new Date()
            })
            .eq('id', id_sticker);

        if (updateError) throw updateError;

        return res.status(200).json({ success: true, message: 'Sticker vinculado exitosamente' });

    } catch (err) {
        return res.status(500).json({ error: 'Error interno en la base de datos.' });
    }
}
