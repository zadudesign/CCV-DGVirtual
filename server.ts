import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Initialize Supabase Admin Client (only to be used on the server)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/admin/users", async (req, res) => {
    try {
      const { email, password, role, name, documento, facultad, programa, telefono, team_area, firma_digital } = req.body;

      if (!supabaseUrl || !supabaseServiceKey) {
        return res.status(500).json({ error: "Supabase Service Role Key no configurada en el servidor." });
      }

      // 1. Create user in auth.users
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          documento,
          telefono,
          facultad,
          programa,
          team_area
        },
        app_metadata: {
          role
        }
      });

      if (authError) {
        return res.status(400).json({ error: authError.message });
      }

      if (!authData.user) {
        return res.status(400).json({ error: "No se pudo crear el usuario." });
      }

      // 2. Create profile in public.profiles
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert([
          {
            id: authData.user.id,
            email,
            role,
            name,
            documento,
            telefono,
            facultad,
            programa,
            team_area,
            firma_digital
          }
        ]);

      if (profileError) {
        // Rollback user creation if profile fails
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return res.status(400).json({ error: profileError.message });
      }

      res.json({ message: "Usuario creado exitosamente", user: authData.user });
    } catch (error: any) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.delete("/api/admin/users/:id", async (req, res) => {
    try {
      const { id } = req.params;

      if (!supabaseUrl || !supabaseServiceKey) {
        return res.status(500).json({ error: "Supabase Service Role Key no configurada en el servidor." });
      }

      // 1. Delete from public.profiles (optional if ON DELETE CASCADE is set, but good practice)
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', id);

      if (profileError) {
        console.error("Error deleting profile:", profileError);
        // Continue anyway to try deleting the auth user
      }

      // 2. Delete from auth.users
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);

      if (authError) {
        return res.status(400).json({ error: authError.message });
      }

      res.json({ message: "Usuario eliminado exitosamente" });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.post("/api/auth/get-email", async (req, res) => {
    try {
      const { documento } = req.body;

      if (!supabaseUrl || !supabaseServiceKey) {
        return res.status(500).json({ error: "Supabase Service Role Key no configurada en el servidor." });
      }

      if (!documento) {
        return res.status(400).json({ error: "El documento es requerido" });
      }

      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('documento', documento)
        .limit(1)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: "Usuario no encontrado con ese documento" });
      }

      res.json({ email: data.email });
    } catch (error: any) {
      console.error("Error fetching email:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.post("/api/clickup/sync", async (req, res) => {
    try {
      const { list_id, curso_id } = req.body;
      const clickupApiKey = process.env.CLICKUP_API_KEY;

      if (!clickupApiKey) {
        return res.status(500).json({ error: "CLICKUP_API_KEY no configurada en el servidor." });
      }

      if (!list_id || !curso_id) {
        return res.status(400).json({ error: "list_id y curso_id son requeridos" });
      }

      // Fetch tasks from ClickUp
      const response = await fetch(`https://api.clickup.com/api/v2/list/${list_id}/task?subtasks=true`, {
        method: 'GET',
        headers: {
          'Authorization': clickupApiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("ClickUp API Error:", errorData);
        return res.status(response.status).json({ error: "Error al obtener tareas de ClickUp" });
      }

      const data = await response.json();
      const tasks = data.tasks || [];

      if (tasks.length === 0) {
        return res.json({ message: "No hay tareas en la lista", progreso: 0 });
      }

      // Calculate progress
      const completedTasks = tasks.filter((t: any) => t.status.type === 'done' || t.status.type === 'closed').length;
      const progreso = Math.round((completedTasks / tasks.length) * 100);

      // Determine state based on progress
      let estado = 'Planificación';
      if (progreso > 0 && progreso < 100) estado = 'En Desarrollo';
      if (progreso === 100) estado = 'Revisión'; // Or 'Publicado', depending on logic

      // Update Supabase
      const { error: updateError } = await supabaseAdmin
        .from('cursos')
        .update({ progreso, estado })
        .eq('id', curso_id);

      if (updateError) {
        return res.status(500).json({ error: "Error al actualizar el progreso en la base de datos" });
      }

      res.json({ message: "Progreso sincronizado exitosamente", progreso, estado, total: tasks.length, completadas: completedTasks });
    } catch (error: any) {
      console.error("Error syncing with ClickUp:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
