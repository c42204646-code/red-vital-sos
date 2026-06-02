module.exports = async function(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Método no permitido" });
    }

    try {
        const { id_usuario, latitud, longitud, url_mapa } = req.body;

        if (!id_usuario) return res.status(400).json({ error: "Falta el ID del usuario" });

        const SUPABASE_URL = process.env.SUPABASE_URL; 
        const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
        const RESEND_API_KEY = process.env.RESEND_API_KEY;

        // 1. BUSCAR EN SUPABASE
        const supabaseEndpoint = `${SUPABASE_URL}/rest/v1/usuarios_emergencia?id=eq.${id_usuario}&select=*`;
        const supabaseResponse = await fetch(supabaseEndpoint, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        const userData = await supabaseResponse.json();
        if (!userData || userData.length === 0) {
            return res.status(404).json({ error: "Usuario no encontrado en la base de datos" });
        }
        
        const usuario = userData[0];

        // 2. ENVIAR A TELEGRAM
        let telegramExito = false;
        if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
            const mensajeTelegram = `🚨 <b>EMERGENCIA: ${usuario.nombre}</b>\n📍 <a href="${url_mapa}">Ubicación GPS</a>\n📞 Tel: ${usuario.contacto_telefono || 'N/A'}\n🩸 Sangre: ${usuario.sangre || 'N/A'}`;
            
            const telegramResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: mensajeTelegram, parse_mode: 'HTML' })
            });
            telegramExito = telegramResponse.ok;
        }

        // 3. ENVIAR CORREO CON RESEND
        let emailExito = false;
        if (RESEND_API_KEY && usuario.contacto_email) { 
            const resendResponse = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: "RED Vital <onboarding@resend.dev>",
                    to: [usuario.contacto_email],
                    subject: `🚨 ALERTA MÉDICA: ${usuario.nombre}`,
                    html: `<div style="border:2px solid red; padding:20px; font-family: sans-serif;">
                            <h2 style="color: red;">Emergencia: ${usuario.nombre}</h2>
                            <p>📍 <a href="${url_mapa}">Ver ubicación exacta en Google Maps</a></p>
                            <h3>Historial Médico:</h3>
                            <ul>
                                <li><strong>Sangre:</strong> ${usuario.sangre || 'No especificado'}</li>
                                <li><strong>Alergias:</strong> ${usuario.alergias || 'Ninguna reportada'}</li>
                                <li><strong>Condiciones:</strong> ${usuario.condiciones || 'Ninguna reportada'}</li>
                            </ul>
                            <p><em>Por favor atienda esta alerta de inmediato.</em></p>
                           </div>`
                })
            });
            emailExito = resendResponse.ok;
        }

        // 4. RESPUESTA DE ÉXITO
        return res.status(200).json({ 
            success: true, 
            telegram_sent: telegramExito,
            email_sent: emailExito
        });

    } catch (error) {
        console.error("Error crítico:", error);
        return res.status(500).json({ error: "Error en el servidor de Vercel" });
    }
};
