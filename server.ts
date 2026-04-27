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
      const { email, password, role, name, documento, facultad, programa, telefono, team_area, firma_digital, photoURL } = req.body;

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
            firma_digital,
            photoURL
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

  // Education Continua Proxy Endpoints (Bypass RLS for this specific role)
  app.get("/api/educacion-continua/proyectos", async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('proyectos_ec')
        .select('*')
        .order('nombre', { ascending: true });
      
      if (error) return res.status(400).json({ error: error.message });
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/educacion-continua/tareas", async (req, res) => {
    try {
      // Get all EC project names first
      const { data: pData } = await supabaseAdmin.from('proyectos_ec').select('nombre');
      const pNames = pData?.map(p => p.nombre) || [];

      if (pNames.length === 0) return res.json([]);

      const { data, error } = await supabaseAdmin
        .from('notificaciones_tareas')
        .select('*')
        .in('proyecto', pNames)
        .order('fecha_vencimiento', { ascending: true });

      if (error) return res.status(400).json({ error: error.message });
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/educacion-continua/rates", async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('configuracion_tarifas')
        .select('*');
      
      if (error) return res.status(400).json({ error: error.message });
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: "Internal server error" });
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

      // Calculate detailed stats for charts
      // 1. Promedios por Proceso (based on tags or list names)
      const procesosMap: Record<string, { total: number, completed: number }> = {
        'Documentación': { total: 0, completed: 0 },
        'Grabación': { total: 0, completed: 0 },
        'Edición': { total: 0, completed: 0 },
        'Soporte': { total: 0, completed: 0 }
      };

      // 2. Promedios por Unidad (based on task name containing "Unidad X" or tags)
      const unidadesMap: Record<string, { total: number, completed: number }> = {};

      tasks.forEach((t: any) => {
        const isCompleted = t.status.type === 'done' || t.status.type === 'closed';
        
        // Check tags for procesos
        const tags = t.tags?.map((tag: any) => tag.name.toLowerCase()) || [];
        let matchedProceso = false;
        
        if (tags.includes('documentación') || tags.includes('documentacion') || t.name.toLowerCase().includes('doc')) {
          procesosMap['Documentación'].total++;
          if (isCompleted) procesosMap['Documentación'].completed++;
          matchedProceso = true;
        }
        if (tags.includes('grabación') || tags.includes('grabacion') || t.name.toLowerCase().includes('grab')) {
          procesosMap['Grabación'].total++;
          if (isCompleted) procesosMap['Grabación'].completed++;
          matchedProceso = true;
        }
        if (tags.includes('edición') || tags.includes('edicion') || t.name.toLowerCase().includes('edi')) {
          procesosMap['Edición'].total++;
          if (isCompleted) procesosMap['Edición'].completed++;
          matchedProceso = true;
        }
        if (tags.includes('soporte') || t.name.toLowerCase().includes('soporte')) {
          procesosMap['Soporte'].total++;
          if (isCompleted) procesosMap['Soporte'].completed++;
          matchedProceso = true;
        }

        // Check for Unidades (e.g., "Unidad 1", "U1")
        const unidadMatch = t.name.match(/Unidad\s*(\d+)/i) || t.name.match(/U(\d+)/i);
        if (unidadMatch) {
          const unidadName = `Unidad ${unidadMatch[1]}`;
          if (!unidadesMap[unidadName]) unidadesMap[unidadName] = { total: 0, completed: 0 };
          unidadesMap[unidadName].total++;
          if (isCompleted) unidadesMap[unidadName].completed++;
        }
      });

      const clickup_stats = {
        procesos: Object.entries(procesosMap).map(([name, stats]) => ({
          name,
          value: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
          total: stats.total
        })).filter(p => p.total > 0), // Only include processes that have tasks
        unidades: Object.entries(unidadesMap).map(([name, stats]) => ({
          name,
          total: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
          data: [
            { name: 'Completado', value: stats.completed },
            { name: 'Pendiente', value: stats.total - stats.completed }
          ]
        })).sort((a, b) => a.name.localeCompare(b.name))
      };

      // Update Supabase
      const { error: updateError } = await supabaseAdmin
        .from('cursos')
        .update({ progreso, estado, clickup_stats })
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
