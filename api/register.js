// api/registrar.js
import { createClient } from '@supabase/supabase-js';

// Conexión a prueba de balas (busca las variables estándar de Vercel)
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { nombre, sangre, alergias, condiciones, telefono, email } = req.body;

    // Generamos un ID de usuario único (Ej: EXC-85338)
    const id_generado = 'EXC-' + Math.floor(10000 + Math.random() * 90000);

    try {
        // Guardamos en la tabla usuarios_emergencia (vista en tu Supabase)
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

        // Respondemos al frontend enviando el ID generado
        return res.status(200).json({ success: true, id_generado });

    } catch (error) {
        console.error('Error al registrar usuario:', error);
        return res.status(500).json({ error: 'No se pudo guardar en la base de datos' });
    }
}
