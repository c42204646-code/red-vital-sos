module.exports = async function(req, res) {
    // Si no es POST, lo rechazamos
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Método no permitido" });
    }

    try {
        const datosAlerta = req.body;
        console.log("1. Datos recibidos:", datosAlerta);

        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

        console.log("2. Llave Token existe:", !!TELEGRAM_BOT_TOKEN);
        console.log("3. Llave Chat ID existe:", !!TELEGRAM_CHAT_ID);

        // Validación inicial
        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
            return res.status(400).json({ 
                error: "Faltan las llaves de Telegram", 
                detalles: "Revisa TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID en Vercel." 
            });
        }

        // Mensaje simplificado para la prueba
        const mensajeTelegram = `🚨 ¡PRUEBA DE ALERTA SOS! 🚨\n\nID Escaneado: ${datosAlerta.id_usuario || 'Desconocido'}\nUbicación: ${datosAlerta.ubicacion || 'No proporcionada'}`;

        console.log("4. Intentando enviar a Telegram...");

        // Petición a Telegram
        const resTelegram = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: mensajeTelegram
            })
        });

        // Revisar respuesta de Telegram
        if (resTelegram.ok) {
            console.log("5. ¡Telegram enviado con éxito!");
            return res.status(200).json({ 
                success: true, 
                telegram: true,
                mensaje: "¡Alerta de Telegram enviada!"
            });
        } else {
            const errorT = await resTelegram.text();
            console.error("5. ERROR DE TELEGRAM:", errorT);
            // Esto devolverá el error exacto a la pantalla de tu página web
            return res.status(500).json({ 
                error: "Telegram rechazó el mensaje", 
                detalles: errorT 
            });
        }

    } catch (error) {
        console.error("Error crítico en servidor Vercel:", error);
        return res.status(500).json({ error: "Error interno", detalles: error.message });
    }
};
