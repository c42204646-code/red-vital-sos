module.exports = async function(req, res) {
    // Solo aceptamos peticiones POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Método no permitido" });
    }

    try {
        const datosAlerta = req.body;
        console.log("Activando alerta para:", datosAlerta.id_usuario);

        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
        const RESEND_API_KEY = process.env.RESEND_API_KEY;

        if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
            return res.status(500).json({ error: "Faltan llaves de Supabase en Vercel" });
        }

        // ==========================================
        // 0. BUSCAR DATOS DEL PACIENTE EN SUPABASE
        // ==========================================
        // Usamos el ID para traer su nombre, contacto, sangre, etc.
        const supabaseEndpoint = `${SUPABASE_URL}/rest/v1/usuarios_emergencia?id=eq.${datosAlerta.id_usuario}&select=*`;
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
            return res.status(404).json({ error: "Usuario no encontrado en BD" });
        }
        
        const paciente = userData[0]; // Aquí ya tenemos todos sus datos

        // La ubicación que envía la página web
        const ubicacionMapa = datosAlerta.url_mapa || "No detectada";

        let telegramEnviado = false;
        let emailEnviado = false;

        // ==========================================
        // 1. ENVIAR ALERTA A TELEGRAM
        // ==========================================
        if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
            const mensajeTelegram = `🚨 ¡ALERTA SOS RED VITAL! 🚨\n\n👤 Paciente: ${paciente.nombre || 'Desconocido'}\n🆔 ID: ${paciente.id}\n📞 Teléfono: ${paciente.contacto_telefono || 'No proporcionado'}\n📍 Ubicación: ${ubicacionMapa}`;

            const resTelegram = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: mensajeTelegram
                })
            });

            if (resTelegram.ok) {
                telegramEnviado = true;
            } else {
                console.error("Fallo Telegram:", await resTelegram.text());
            }
        }

        // ==========================================
        // 2. ENVIAR ALERTA POR CORREO (RESEND)
        // ==========================================
        if (RESEND_API_KEY && paciente.contacto_email) {
            const resEmail = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: 'onboarding@resend.dev',
                    to: paciente.contacto_email, // IMPORTANTE: En la cuenta gratis de Resend, este debe ser TU propio correo.
                    subject: `🚨 ALERTA SOS - Paciente ${paciente.nombre || 'Desconocido'}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; border: 2px solid red; padding: 20px; border-radius: 10px;">
                            <h2 style="color: red; text-align: center;">¡Emergencia Médica! 🚨</h2>
                            <p>Se ha activado una alerta SOS para el paciente <strong>${paciente.nombre || 'Desconocido'}</strong>.</p>
                            <hr>
                            <p><strong>🆔 ID de Usuario:</strong> ${paciente.id}</p>
                            <p><strong>📞 Teléfono de Contacto:</strong> ${paciente.contacto_telefono || 'No proporcionado'}</p>
                            <p><strong>📍 Ubicación:</strong> <a href="${ubicacionMapa}">Ver en Google Maps</a></p>
                            <ul>
                                <li><strong>Sangre:</strong> ${paciente.sangre || 'N/A'}</li>
                                <li><strong>Alergias:</strong> ${paciente.alergias || 'N/A'}</li>
                                <li><strong>Condiciones:</strong> ${paciente.condiciones || 'N/A'}</li>
                            </ul>
                            <br>
                            <p style="text-align: center; font-size: 18px; font-weight: bold;">Por favor, actúe de inmediato.</p>
                        </div>
                    `
                })
            });

            if (resEmail.ok) {
                emailEnviado = true;
            } else {
                console.error("Fallo Resend:", await resEmail.text());
            }
        }

        // Responder a la página web
        return res.status(200).json({ 
            success: true, 
            telegram: telegramEnviado, 
            email: emailEnviado 
        });

    } catch (error) {
        console.error("Error crítico:", error);
        return res.status(500).json({ error: "Error interno", detalles: error.message });
    }
};
