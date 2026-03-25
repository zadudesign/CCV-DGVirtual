import { createClient } from "@supabase/supabase-js";

export default async function handler(req: any, res: any) {
  // Configurar CORS por si acaso
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: "Supabase Service Role Key no configurada en el servidor." });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    const { documento } = req.body;

    if (!documento) {
      return res.status(400).json({ error: "El documento es requerido" });
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('documento', documento)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Usuario no encontrado con ese documento" });
    }

    return res.status(200).json({ email: data.email });
  } catch (error: any) {
    console.error("Error fetching email:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}
