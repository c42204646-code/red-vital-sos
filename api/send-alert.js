module.exports = async function(req, res) {
    // Si no es POST, lo rechazamos
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Método no permitido" });
    }

    try {
        const datosAlerta = req.body;

        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
        const RESEND_API_KEY = process.env.RESEND_API_KEY;

        let telegramEnviado = false;
        let emailEnviado = false;
        let errores = [];

        // 1. Enviar a Telegram
        if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
            const mensajeTelegram = `🚨 ¡ALERTA SOS RED VITAL! 🚨\n\nPaciente: ${datosAlerta.nombre || 'Desconocido'}\nID: ${datosAlerta.id_usuario}\nUbicación: ${datosAlerta.ubicacion || 'No proporcionada'}\nContacto: ${datosAlerta.telefono || 'No proporcionado'}`;

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
                const errorT = await resTelegram.text();
                console.error("Error de Telegram:", errorT);
                errores.push("Telegram falló");
            }
        }

        // 2. Enviar a Resend (Correo)
        if (RESEND_API_KEY) {
            const resEmail = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: 'onboarding@resend.dev',
                    to: datosAlerta.email, // Aquí usa tu correo para pruebas
                    subject: `🚨 ALERTA SOS - Paciente ${datosAlerta.nombre || 'Desconocido'}`,
                    html: `<h2>¡Emergencia Médica!</h2>
                           <p>Se ha activado una alerta SOS para el paciente <strong>${datosAlerta.nombre || 'Desconocido'}</strong>.</p>
                           <p><strong>ID de Usuario:</strong> ${datosAlerta.id_usuario}</p>
                           <p><strong>Ubicación:</strong> ${datosAlerta.ubicacion || 'No detectada'}</p>
                           <p><strong>Teléfono:</strong> ${datosAlerta.telefono || 'No proporcionado'}</p>
                           <p style="color:red; font-weight:bold;">Por favor, actúe de inmediato.</p>`
                })
            });

            if (resEmail.ok) {
                emailEnviado = true;
            } else {
                const errorR = await resEmail.text();
                console.error("Error de Resend:", errorR);
                errores.push("Resend falló");
            }
        }

        // Comprobamos si al menos uno se envió
        if (!telegramEnviado && !emailEnviado) {
            return res.status(500).json({ error: "Ninguna alerta pudo enviarse", detalles: errores });
        }

        // Si llegó aquí, al menos una alerta se envió con éxito
        return res.status(200).json({ 
            success: true, 
            telegram: telegramEnviado, 
            email: emailEnviado 
        });

    } catch (error) {
        console.error("Error crítico en Vercel:", error);
        return res.status(500).json({ error: "Error interno del servidor", detalles: error.message });
    }
};
