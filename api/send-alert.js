import { createClient } from '@supabase/supabase-js';

// Usamos las llaves exactas que ya comprobamos que funcionan
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { id_usuario, latitud, longitud, url_mapa } = req.body;

    try {
        // 1. Buscar al paciente en la tabla CORRECTA
        const { data: paciente, error } = await supabase
            .from('usuarios_emergencia')
            .select('*')
            .eq('id', id_usuario)
            .single();

        // Si falla la búsqueda, devolvemos el error que viste en pantalla
        if (error || !paciente) {
            return res.status(404).json({ error: 'Usuario no encontrado en BD' });
        }

        // 2. Preparar el mensaje de alerta para Telegram
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;

        if (botToken && chatId) {
            const mensaje = `🚨 ¡ALERTA MÉDICA SOS! 🚨\n\n` +
                            `👤 Paciente: ${paciente.nombre}\n` +
                            `🩸 Sangre: ${paciente.sangre}\n` +
                            `⚠️ Alergias: ${paciente.alergias}\n` +
                            `⚕️ Condiciones: ${paciente.condiciones}\n\n` +
                            `📞 Contacto Familiar: ${paciente.contacto_telefono}\n\n` +
                            `📍 Ubicación de la Emergencia:\n${url_mapa}`;

            // Enviar a Telegram
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: mensaje
                })
            });
        }

        // Si todo sale bien, respondemos con éxito
        return res.status(200).json({ success: true });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error interno al enviar la alerta' });
    }
}
