module.exports = async function(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Método no permitido" });
    }

    try {
        const datosUsuario = req.body; 

        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

        const nuevoId = "EXC-" + Math.floor(10000 + Math.random() * 90000);

        const payload = {
            id: nuevoId,
            nombre: datosUsuario.nombre,
            sangre: datosUsuario.sangre,
            alergias: datosUsuario.alergias,
            condiciones: datosUsuario.condiciones,
            contacto_telefono: datosUsuario.telefono,
            contacto_email: datosUsuario.email
        };

        const supabaseResponse = await fetch(`${SUPABASE_URL}/rest/v1/usuarios_emergencia`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(payload)
        });

        if (!supabaseResponse.ok) {
            const errorText = await supabaseResponse.text();
            console.error("Error BD:", errorText);
            return res.status(400).json({ error: "Fallo en Supabase", details: errorText });
        }

        return res.status(200).json({ success: true, id_generado: nuevoId });

    } catch (error) {
        console.error("Error en servidor Vercel:", error);
        return res.status(500).json({ error: "Error interno del servidor", details: error.message });
    }
};
