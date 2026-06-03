module.exports = async function(req, res) {
    // Solo aceptamos peticiones POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Método no permitido" });
    }

    try {
        const datosAlerta = req.body;
        console.log("Activando alerta para:", datosAlerta.id_usuario);

        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
        const RESEND_API_KEY = process.env.RESEND_API_KEY;

        let telegramEnviado = false;
        let emailEnviado = false;

        // ==========================================
        // 1. ENVIAR ALERTA A TELEGRAM
        // ==========================================
        if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
            const mensajeTelegram = `🚨 ¡ALERTA SOS RED VITAL! 🚨\n\n👤 Paciente: ${datosAlerta.nombre || 'Desconocido'}\n🆔 ID: ${datosAlerta.id_usuario}\n📞 Teléfono: ${datosAlerta.telefono || 'No proporcionado'}\n📍 Ubicación: ${datosAlerta.ubicacion || 'No detectada'}`;

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
        if (RESEND_API_KEY && datosAlerta.email) {
            const resEmail = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: 'onboarding@resend.dev',
                    to: datosAlerta.email, // IMPORTANTE: En la cuenta gratis, debe ser TU propio correo.
                    subject: `🚨 ALERTA SOS - Paciente ${datosAlerta.nombre || 'Desconocido'}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; border: 2px solid red; padding: 20px; border-radius: 10px;">
                            <h2 style="color: red; text-align: center;">¡Emergencia Médica! 🚨</h2>
                            <p>Se ha activado una alerta SOS para el paciente <strong>${datosAlerta.nombre || 'Desconocido'}</strong>.</p>
                            <hr>
                            <p><strong>🆔 ID de Usuario:</strong> ${datosAlerta.id_usuario}</p>
                            <p><strong>📞 Teléfono de Contacto:</strong> ${datosAlerta.telefono || 'No proporcionado'}</p>
                            <p><strong>📍 Ubicación:</strong> ${datosAlerta.ubicacion || 'No detectada'}</p>
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
