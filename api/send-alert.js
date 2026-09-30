import { createClient } from '@supabase/supabase-js';

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
        const { data: paciente, error } = await supabase
            .from('usuarios_emergencia')
            .select('*')
            .eq('id', id_usuario)
            .single();

        if (error || !paciente) {
            return res.status(404).json({ error: 'Usuario no encontrado en BD' });
        }

        // Cargamos todas las llaves de tu Vercel
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;
        const resendApiKey = process.env.RESEND_API_KEY;

        // ==========================================
        // 1. ENVIAR ALERTA POR TELEGRAM
        // ==========================================
        if (botToken && chatId) {
            const mensajeTelegram = `🚨 ¡ALERTA MÉDICA SOS! 🚨\n\n` +
                            `👤 Paciente: ${paciente.nombre}\n` +
                            `🩸 Sangre: ${paciente.sangre}\n` +
                            `⚠️ Alergias: ${paciente.alergias}\n` +
                            `⚕️ Condiciones: ${paciente.condiciones}\n\n` +
                            `📞 Contacto Familiar: ${paciente.contacto_telefono}\n\n` +
                            `📍 Ubicación GPS:\n${url_mapa}`;

            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: mensajeTelegram })
            }).catch(e => console.error("Error Telegram:", e));
        }

        // ==========================================
        // 2. ENVIAR ALERTA POR CORREO (RESEND)
        // ==========================================
        if (resendApiKey && paciente.contacto_email) {
            const htmlCorreo = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #dc2626; border-radius: 10px; overflow: hidden;">
                    <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
                        <h1 style="margin: 0; font-size: 24px;">🚨 ALERTA DE EMERGENCIA SOS</h1>
                    </div>
                    <div style="padding: 20px; background-color: #fef2f2;">
                        <p style="font-size: 16px; color: #333;">Se ha escaneado la etiqueta médica de <strong>${paciente.nombre}</strong> y se ha presionado el botón de alerta.</p>
                        
                        <h3 style="color: #dc2626; border-bottom: 1px solid #fca5a5; padding-bottom: 5px;">Datos Clínicos del Paciente</h3>
                        <ul style="list-style: none; padding: 0; color: #444; font-size: 15px;">
                            <li style="margin-bottom: 5px;"><strong>🩸 Tipo de Sangre:</strong> ${paciente.sangre}</li>
                            <li style="margin-bottom: 5px;"><strong>⚠️ Alergias:</strong> ${paciente.alergias}</li>
                            <li style="margin-bottom: 5px;"><strong>⚕️ Condiciones:</strong> ${paciente.condiciones}</li>
                            <li style="margin-bottom: 5px;"><strong>📞 Teléfono Contacto:</strong> ${paciente.contacto_telefono}</li>
                        </ul>
                        
                        <div style="margin-top: 30px; text-align: center;">
                            <a href="${url_mapa}" style="background-color: #dc2626; color: white; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">📍 VER UBICACIÓN GPS</a>
                        </div>
                    </div>
                </div>
            `;

            await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${resendApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: 'RED Vital SOS <onboarding@resend.dev>',
                    to: paciente.contacto_email,
                    subject: `🚨 ALERTA SOS: Emergencia de ${paciente.nombre}`,
                    html: htmlCorreo
                })
            }).catch(e => console.error("Error Correo:", e));
        }

        return res.status(200).json({ success: true });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error interno al enviar la alerta' });
    }
}
