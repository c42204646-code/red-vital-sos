module.exports = async function(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Método no permitido" });
    }

    try {
        const { id_usuario, latitud, longitud, url_mapa } = req.body;

        if (!id_usuario) return res.status(400).json({ error: "Falta el ID del usuario" });

        // Claves de entorno
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
        const RESEND_API_KEY = process.env.RESEND_API_KEY;

        // 1. Obtener datos del usuario desde Supabase
        const supabaseResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/usuarios_emergencia?id=eq.${id_usuario}&select=*`,
            {
                headers: {
                    'apikey': SUPABASE_SERVICE_KEY,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        const usuarios = await supabaseResponse.json();
        if (!usuarios || usuarios.length === 0) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }
        const usuario = usuarios[0];

        // 2. Preparar mensajes
        const ubicacionTexto = url_mapa || `https://www.google.com/maps?q=${latitud},${longitud}`;
        const mensajeTelegram = 
            `🚨 ¡ALERTA SOS RED VITAL! 🚨\n` +
            `👤 Paciente: ${usuario.nombre}\n` +
            `🆔 ID: ${id_usuario}\n` +
            `📍 Ubicación: ${ubicacionTexto}\n` +
            `📞 Contacto: ${usuario.contacto_telefono || 'No registrado'}\n` +
            `🩸 Sangre: ${usuario.sangre || 'No especificada'}\n` +
            `⚠️ Alergias: ${usuario.alergias || 'Ninguna'}\n` +
            `🩺 Condiciones: ${usuario.condiciones || 'Ninguna'}`;

        let telegramEnviado = false;
        let emailEnviado = false;

        // 3. Enviar a Telegram
        if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
            const tgResp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: mensajeTelegram,
                    parse_mode: 'HTML' // si quieres usar HTML, pero mejor usar plain text para evitar problemas
                })
            });
            telegramEnviado = tgResp.ok;
            if (!tgResp.ok) console.error("Error Telegram:", await tgResp.text());
        }

        // 4. Enviar correo con Resend
        if (RESEND_API_KEY && usuario.contacto_email) {
            const resendResp = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: 'onboarding@resend.dev',
                    to: usuario.contacto_email,
                    subject: `🚨 ALERTA SOS - ${usuario.nombre}`,
                    html: `
                        <div style="border:2px solid red; padding:20px; font-family:sans-serif;">
                            <h2 style="color:red;">¡Emergencia Médica!</h2>
                            <p><strong>Paciente:</strong> ${usuario.nombre}</p>
                            <p><strong>ID:</strong> ${id_usuario}</p>
                            <p><strong>Ubicación:</strong> <a href="${ubicacionTexto}">Ver en Google Maps</a></p>
                            <p><strong>Teléfono de contacto:</strong> ${usuario.contacto_telefono || 'No disponible'}</p>
                            <hr>
                            <h3>Historial médico:</h3>
                            <ul>
                                <li><strong>Sangre:</strong> ${usuario.sangre || 'No especificada'}</li>
                                <li><strong>Alergias:</strong> ${usuario.alergias || 'Ninguna'}</li>
                                <li><strong>Condiciones:</strong> ${usuario.condiciones || 'Ninguna'}</li>
                            </ul>
                            <p style="color:red; font-weight:bold;">Por favor, actúe de inmediato.</p>
                        </div>
                    `
                })
            });
            emailEnviado = resendResp.ok;
            if (!resendResp.ok) console.error("Error Resend:", await resendResp.text());
        }

        // 5. Respuesta final
        if (!telegramEnviado && !emailEnviado) {
            return res.status(500).json({ error: "No se pudo enviar ninguna alerta" });
        }

        return res.status(200).json({
            success: true,
            telegram: telegramEnviado,
            email: emailEnviado
        });

    } catch (error) {
        console.error("Error en send-alert:", error);
        return res.status(500).json({ error: "Error interno del servidor" });
    }
};
