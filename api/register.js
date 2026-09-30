import { createClient } from '@supabase/supabase-js';

// Conexión corregida usando tus variables exactas
const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY // ¡Aquí estaba el error!
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { nombre, sangre, alergias, condiciones, telefono, email } = req.body;

    const id_generado = 'EXC-' + Math.floor(10000 + Math.random() * 90000);

    try {
        const { error } = await supabase
            .from('usuarios_emergencia')
            .insert([{ 
                id: id_generado, 
                nombre, 
                sangre, 
                alergias, 
                condiciones, 
                telefono, 
                email 
            }]);

        if (error) throw error;

        return res.status(200).json({ success: true, id_generado });

    } catch (error) {
        console.error('Error al registrar usuario:', error);
        return res.status(500).json({ error: 'No se pudo guardar en la base de datos' });
    }
}
