// API/index.js
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs"; // Importar bcrypt para manejar contraseñas
import jwt from "jsonwebtoken"; // Importar jsonwebtoken para generar tokens
import { pool } from "./conexion_db.js"; // Importa el pool de conexión

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Clave secreta para JWT (debería estar en .env)
const JWT_SECRET = process.env.JWT_SECRET || "clave_secreta_por_defecto_cambia_esto"; // Cambia esta clave en .env

// ================================
// MIDDLEWARES DE AUTENTICACIÓN Y AUTORIZACIÓN
// ================================

// Middleware para verificar el token JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: "Acceso denegado. No hay token." });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error("Error verificando token:", err);
      return res.status(403).json({ error: "Token inválido o expirado." });
    }
    req.user = user; // Añade la información del usuario decodificada al objeto req
    next();
  });
};

// Middleware para verificar rol de administrador
const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Acceso denegado. Requiere rol de administrador." });
  }
  next();
};

// ================================
// RUTA DE LOGIN
// ================================

app.post("/login", async (req, res) => {
  try {
    const { correo, password } = req.body;

    if (!correo || !password) {
      return res.status(400).json({ error: "Correo y contraseña son requeridos." });
    }

    // Buscar usuario por correo
    const [userRows] = await pool.execute(
      "SELECT id_usuario, nombre_completo, correo, password, role, estado_cuenta FROM usuarios WHERE correo = ?",
      [correo]
    );

    if (userRows.length === 0) {
      // Importante: No revelar si el usuario no existe o la contraseña es incorrecta
      return res.status(401).json({ error: "Credenciales inválidas." });
    }

    const user = userRows[0];

    // Verificar estado de la cuenta
    if (user.estado_cuenta !== 'activo') {
        return res.status(403).json({ error: `Acceso denegado. Cuenta ${user.estado_cuenta}.` });
    }

    // Comparar la contraseña ingresada con el hash almacenado
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Credenciales inválidas." });
    }

    // Generar token JWT
    const token = jwt.sign(
      { id: user.id_usuario, correo: user.correo, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" } // El token expira en 24 horas
    );

    // Devolver token y datos del usuario (sin la contraseña)
    res.json({
      message: "Login exitoso.",
      token: token,
      user: {
        id: user.id_usuario,
        nombre_completo: user.nombre_completo,
        correo: user.correo,
        role: user.role,
        estado_cuenta: user.estado_cuenta,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ error: "Error interno del servidor en login.", details: error.message });
  }
});

// Ruta para verificar sesión (opcional, útil para el frontend)
app.get("/verificar-sesion", authenticateToken, (req, res) => {
  // Si llega aquí, el token es válido
  res.json({ message: "Sesión válida.", user: req.user });
});

// ================================
// RUTAS PARA USUARIOS (Protegidas por autenticación)
// ================================

// GET - Obtener todos los usuarios (requiere admin)
app.get("/usuarios", authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT id_usuario, nombre_completo, correo, telefono, direccion, role, estado_cuenta, fecha_registro, max_prestamos, max_reservas, created_at FROM usuarios");
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({ error: "Error interno del servidor al obtener usuarios.", details: error.message });
  }
});

// GET - Obtener un usuario por ID (requiere admin o ser el mismo usuario)
app.get("/usuarios/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    const requestingUserId = req.user.id; // ID del usuario autenticado

    if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: "ID de usuario inválido." });
    }

    // Permitir acceso si es admin o si es el mismo usuario
    if (req.user.role !== "admin" && requestingUserId != userId) {
        return res.status(403).json({ error: "Acceso denegado." });
    }

    const [rows] = await pool.execute(
      "SELECT id_usuario, nombre_completo, correo, telefono, direccion, role, estado_cuenta, foto_perfil, max_prestamos, max_reservas, created_at FROM usuarios WHERE id_usuario = ?",
      [userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    res.status(500).json({ error: "Error interno del servidor al obtener usuario.", details: error.message });
  }
});

// POST - Crear un nuevo usuario (requiere admin)
app.post("/usuarios", authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { nombre_completo, password, identificacion, correo, telefono, role = "estudiante", estado_cuenta = "activo" } = req.body;

    if (!nombre_completo || !password || !identificacion || !correo) {
      return res.status(400).json({ error: "Nombre completo, contraseña, identificación y correo son requeridos." });
    }

    // Encriptar la contraseña antes de guardarla
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const createdAt = new Date();
    const updatedAt = new Date();

    const [result] = await pool.execute(
      `INSERT INTO usuarios 
        (nombre_completo, password, identificacion, correo, telefono, role, estado_cuenta, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre_completo, hashedPassword, identificacion, correo, telefono, role, estado_cuenta, createdAt, updatedAt]
    );

    // Opcional: Devolver el usuario recién creado (sin la contraseña)
    const [newUser] = await pool.execute(
      "SELECT id_usuario, nombre_completo, correo, telefono, role, estado_cuenta, created_at FROM usuarios WHERE id_usuario = ?",
      [result.insertId]
    );

    res.status(201).json(newUser[0]);
  } catch (error) {
    console.error("Error al crear usuario:", error);
    if (error.code === 'ER_DUP_ENTRY') {
        const field = error.message.includes('correo') ? 'correo' : 'identificacion';
        res.status(400).json({ error: `El ${field} ya está registrado.`, details: error.message });
    } else {
        res.status(500).json({ error: "Error interno del servidor al crear usuario.", details: error.message });
    }
  }
});

// PUT - Actualizar un usuario (requiere admin o ser el mismo usuario)
app.put("/usuarios/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    const requestingUserId = req.user.id;

    const { nombre_completo, identificacion, correo, telefono, direccion, role, estado_cuenta, max_prestamos, max_reservas } = req.body;

    if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: "ID de usuario inválido." });
    }
    // Validar campos según sea necesario, aquí asumimos al menos uno debe estar presente
    if (!nombre_completo && !identificacion && !correo && !telefono) {
      return res.status(400).json({ error: "Al menos un campo para actualizar es requerido." });
    }

    // Permitir acceso si es admin o si es el mismo usuario
    if (req.user.role !== "admin" && requestingUserId != userId) {
        return res.status(403).json({ error: "Acceso denegado." });
    }

    // No permitir cambiar el rol o estado a menos que seas admin
    if ((role && req.user.role !== "admin") || (estado_cuenta && req.user.role !== "admin")) {
        return res.status(403).json({ error: "No tienes permiso para cambiar rol o estado de la cuenta." });
    }

    const updatedAt = new Date();

    let query = "UPDATE usuarios SET updated_at = ?";
    const params = [updatedAt];

    if (nombre_completo) {
        query += ", nombre_completo = ?";
        params.push(nombre_completo);
    }
    if (identificacion) {
        query += ", identificacion = ?";
        params.push(identificacion);
    }
    if (correo) {
        query += ", correo = ?";
        params.push(correo);
    }
    if (telefono) {
        query += ", telefono = ?";
        params.push(telefono);
    }
    if (direccion !== undefined) { // Puede ser null
        query += ", direccion = ?";
        params.push(direccion);
    }
    if (role && req.user.role === "admin") { // Solo admin puede actualizar el rol
        query += ", role = ?";
        params.push(role);
    }
    if (estado_cuenta && req.user.role === "admin") { // Solo admin puede actualizar el estado
        query += ", estado_cuenta = ?";
        params.push(estado_cuenta);
    }
    if (max_prestamos !== undefined && req.user.role === "admin") { // Solo admin puede actualizar límite
        query += ", max_prestamos = ?";
        params.push(max_prestamos);
    }
    if (max_reservas !== undefined && req.user.role === "admin") { // Solo admin puede actualizar límite
        query += ", max_reservas = ?";
        params.push(max_reservas);
    }

    query += " WHERE id_usuario = ?";
    params.push(userId);

    const [result] = await pool.execute(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    const [updatedUser] = await pool.execute(
      "SELECT id_usuario, nombre_completo, correo, telefono, direccion, role, estado_cuenta, max_prestamos, max_reservas, created_at FROM usuarios WHERE id_usuario = ?",
      [userId]
    );

    res.json(updatedUser[0]);
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    if (error.code === 'ER_DUP_ENTRY') {
        const field = error.message.includes('correo') ? 'correo' : 'identificacion';
        res.status(400).json({ error: `El ${field} ya está registrado.`, details: error.message });
    } else {
        res.status(500).json({ error: "Error interno del servidor al actualizar usuario.", details: error.message });
    }
  }
});

// DELETE - Eliminar un usuario (requiere admin)
app.delete("/usuarios/:id", authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: "ID de usuario inválido." });
    }

    // IMPORTANTE: Debido a las restricciones ON DELETE CASCADE/RESTRICT, eliminar un usuario puede fallar
    // si tiene préstamos activos. Considera lógica para manejar esto (cancelar préstamos, etc.) antes de eliminar.
    // Por simplicidad, aquí se intenta eliminar directamente.
    const [result] = await pool.execute(
      "DELETE FROM usuarios WHERE id_usuario = ?",
      [userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    res.json({ message: "Usuario eliminado exitosamente." });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    // Puede fallar por restricciones de clave foránea (por ejemplo, préstamos activos)
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
         res.status(500).json({ error: "Error al eliminar usuario. Puede tener préstamos activos o dependencias.", details: error.message });
    } else {
         res.status(500).json({ error: "Error interno del servidor al eliminar usuario.", details: error.message });
    }
  }
});

// ================================
// RUTAS PARA LIBROS (Protegidas por autenticación)
// ================================

// GET - Obtener todos los libros
app.get("/libros", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(`SELECT id_libro, isbn, titulo, autor, editorial, anio_publicacion, genero, descripcion, portada_url, link, idioma, num_paginas, total_ejemplares, ejemplares_disponibles, created_at FROM libros;`);
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener libros:", error);
    res.status(500).json({ error: "Error interno del servidor al obtener libros.", details: error.message });
  }
});

// GET - Obtener un libro por ID
app.get("/libros/:id", authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID de libro inválido." });
    }

    const [rows] = await pool.execute(`SELECT id_libro, isbn, titulo, autor, editorial, anio_publicacion, genero, descripcion, portada_url, link, idioma, num_paginas, total_ejemplares, ejemplares_disponibles, created_at FROM libros WHERE id_libro = ?`, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Libro no encontrado." });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error al obtener libro:", error);
    res.status(500).json({ error: "Error interno del servidor al obtener libro.", details: error.message });
  }
});

// POST - Crear un nuevo libro (requiere admin)
app.post("/libros", authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    let { isbn, titulo, autor, editorial, anio_publicacion, genero, descripcion, portada_url, link, idioma, num_paginas } = req.body;

    if (!titulo || !autor) {
      return res.status(400).json({ error: "Título y autor son requeridos." });
    }

    // Convertir campos vacíos o undefined a null si es necesario
    isbn = isbn || null;
    editorial = editorial || null;
    anio_publicacion = anio_publicacion || null;
    genero = genero || null;
    descripcion = descripcion || null;
    portada_url = portada_url || null;
    link = link || null;
    idioma = idioma || 'Español';
    num_paginas = num_paginas || null;

    const createdAt = new Date();
    const updatedAt = new Date();

    const [result] = await pool.execute(
      `INSERT INTO libros (isbn, titulo, autor, editorial, anio_publicacion, genero, descripcion, portada_url, link, idioma, num_paginas, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [isbn, titulo, autor, editorial, anio_publicacion, genero, descripcion, portada_url, link, idioma, num_paginas, createdAt, updatedAt]
    );

    const [newLibro] = await pool.execute(
      "SELECT id_libro, isbn, titulo, autor, editorial, anio_publicacion, genero, descripcion, portada_url, link, idioma, num_paginas, total_ejemplares, ejemplares_disponibles, created_at FROM libros WHERE id_libro = ?",
      [result.insertId]
    );

    res.status(201).json(newLibro[0]);
  } catch (error) {
    console.error("Error al crear libro:", error);
    if (error.code === "ER_DUP_ENTRY") {
      res.status(400).json({ error: "El ISBN del libro ya existe." });
    } else {
      res.status(500).json({ error: "Error interno del servidor al crear libro.", details: error.message });
    }
  }
});

// PUT - Actualizar un libro (requiere admin)
app.put("/libros/:id", authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    let { titulo, autor, editorial, anio_publicacion, genero, descripcion, portada_url, link, idioma, num_paginas } = req.body;
    const id = req.params.id;

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID de libro inválido." });
    }
    if (!titulo && !autor) {
      return res.status(400).json({ error: "Al menos título o autor deben ser proporcionados para actualizar." });
    }

    // Convertir campos vacíos o undefined a null si es necesario
    editorial = editorial || null;
    anio_publicacion = anio_publicacion || null;
    genero = genero || null;
    descripcion = descripcion || null;
    portada_url = portada_url || null;
    link = link || null;
    idioma = idioma || null;
    num_paginas = num_paginas || null;

    const updatedAt = new Date();

    let query = "UPDATE libros SET updated_at = ?";
    const params = [updatedAt];

    if (titulo) {
        query += ", titulo = ?";
        params.push(titulo);
    }
    if (autor) {
        query += ", autor = ?";
        params.push(autor);
    }
    if (editorial) {
        query += ", editorial = ?";
        params.push(editorial);
    }
    if (anio_publicacion) {
        query += ", anio_publicacion = ?";
        params.push(anio_publicacion);
    }
    if (genero) {
        query += ", genero = ?";
        params.push(genero);
    }
    if (descripcion) {
        query += ", descripcion = ?";
        params.push(descripcion);
    }
    if (portada_url) {
        query += ", portada_url = ?";
        params.push(portada_url);
    }
    if (link) {
        query += ", link = ?";
        params.push(link);
    }
    if (idioma) {
        query += ", idioma = ?";
        params.push(idioma);
    }
    if (num_paginas) {
        query += ", num_paginas = ?";
        params.push(num_paginas);
    }

    query += " WHERE id_libro = ?";
    params.push(id);

    const [result] = await pool.execute(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Libro no encontrado." });
    }

    const [updatedLibro] = await pool.execute(
      "SELECT id_libro, isbn, titulo, autor, editorial, anio_publicacion, genero, descripcion, portada_url, link, idioma, num_paginas, total_ejemplares, ejemplares_disponibles, created_at FROM libros WHERE id_libro = ?",
      [id]
    );

    res.json(updatedLibro[0]);
  } catch (error) {
    console.error("Error al actualizar libro:", error);
    if (error.code === "ER_DUP_ENTRY") {
      res.status(400).json({ error: "El ISBN del libro ya existe." });
    } else {
      res.status(500).json({ error: "Error interno del servidor al actualizar libro.", details: error.message });
    }
  }
});

// DELETE - Eliminar un libro (requiere admin)
app.delete("/libros/:id", authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID de libro inválido." });
    }

    // IMPORTANTE: Debido a ON DELETE CASCADE, eliminar el libro eliminará también sus ejemplares,
    // reservas y notificaciones relacionadas. Asegúrate de que esta sea la intención.
    const [result] = await pool.execute("DELETE FROM libros WHERE id_libro = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Libro no encontrado." });
    }

    res.json({ message: "Libro eliminado exitosamente." });
  } catch (error) {
    console.error("Error al eliminar libro:", error);
    // Puede fallar por restricciones de clave foránea si hay préstamos activos con ejemplares de este libro
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
         res.status(500).json({ error: "Error al eliminar libro. Puede tener préstamos activos con sus ejemplares.", details: error.message });
    } else {
         res.status(500).json({ error: "Error interno del servidor al eliminar libro.", details: error.message });
    }
  }
});

// ================================
// RUTAS PARA EJEMPLARES (Protegidas por autenticación y admin)
// ================================

// GET - Obtener todos los ejemplares
app.get("/ejemplares", authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
        SELECT e.*, l.titulo as titulo_libro
        FROM ejemplares e
        JOIN libros l ON e.id_libro = l.id_libro
    `);
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener ejemplares:", error);
    res.status(500).json({ error: "Error interno del servidor al obtener ejemplares.", details: error.message });
  }
});

// GET - Obtener un ejemplar por ID
app.get("/ejemplares/:id", authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID de ejemplar inválido." });
    }

    const [rows] = await pool.execute(`
        SELECT e.*, l.titulo as titulo_libro
        FROM ejemplares e
        JOIN libros l ON e.id_libro = l.id_libro
        WHERE e.id_ejemplar = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Ejemplar no encontrado." });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error al obtener ejemplar:", error);
    res.status(500).json({ error: "Error interno del servidor al obtener ejemplar.", details: error.message });
  }
});

// POST - Crear un nuevo ejemplar (requiere admin)
app.post("/ejemplares", authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    let { id_libro, codigo_ejemplar, ubicacion, estado_fisico, observaciones } = req.body;

    if (!id_libro || !codigo_ejemplar) {
      return res.status(400).json({ error: "ID del libro y código del ejemplar son requeridos." });
    }

    // Convertir campos vacíos o undefined a null si es necesario
    ubicacion = ubicacion || null;
    estado_fisico = estado_fisico || 'bueno';
    observaciones = observaciones || null;

    const createdAt = new Date();
    const updatedAt = new Date();

    const [result] = await pool.execute(
      `INSERT INTO ejemplares (id_libro, codigo_ejemplar, ubicacion, estado_fisico, observaciones, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id_libro, codigo_ejemplar, ubicacion, estado_fisico, observaciones, createdAt, updatedAt]
    );

    const [newEjemplar] = await pool.execute(`
        SELECT e.*, l.titulo as titulo_libro
        FROM ejemplares e
        JOIN libros l ON e.id_libro = l.id_libro
        WHERE e.id_ejemplar = ?
    `, [result.insertId]);

    res.status(201).json(newEjemplar[0]);
  } catch (error) {
    console.error("Error al crear ejemplar:", error);
    if (error.code === "ER_DUP_ENTRY") {
      res.status(400).json({ error: "El código del ejemplar ya existe." });
    } else {
      res.status(500).json({ error: "Error interno del servidor al crear ejemplar.", details: error.message });
    }
  }
});

// PUT - Actualizar un ejemplar (requiere admin)
app.put("/ejemplares/:id", authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    let { ubicacion, estado_fisico, observaciones } = req.body;
    const id = req.params.id;

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID de ejemplar inválido." });
    }

    // Convertir campos vacíos o undefined a null si es necesario
    ubicacion = ubicacion || null;
    estado_fisico = estado_fisico || null;
    observaciones = observaciones || null;

    const updatedAt = new Date();

    let query = "UPDATE ejemplares SET updated_at = ?";
    const params = [updatedAt];

    if (ubicacion) {
        query += ", ubicacion = ?";
        params.push(ubicacion);
    }
    if (estado_fisico) {
        query += ", estado_fisico = ?";
        params.push(estado_fisico);
    }
    if (observaciones) {
        query += ", observaciones = ?";
        params.push(observaciones);
    }

    query += " WHERE id_ejemplar = ?";
    params.push(id);

    const [result] = await pool.execute(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Ejemplar no encontrado." });
    }

    const [updatedEjemplar] = await pool.execute(`
        SELECT e.*, l.titulo as titulo_libro
        FROM ejemplares e
        JOIN libros l ON e.id_libro = l.id_libro
        WHERE e.id_ejemplar = ?
    `, [id]);

    res.json(updatedEjemplar[0]);
  } catch (error) {
    console.error("Error al actualizar ejemplar:", error);
    if (error.code === "ER_DUP_ENTRY") {
      res.status(400).json({ error: "El código del ejemplar ya existe." });
    } else {
      res.status(500).json({ error: "Error interno del servidor al actualizar ejemplar.", details: error.message });
    }
  }
});

// DELETE - Eliminar un ejemplar (requiere admin)
app.delete("/ejemplares/:id", authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID de ejemplar inválido." });
    }

    // IMPORTANTE: Debido a ON DELETE RESTRICT en préstamos, eliminar un ejemplar
    // fallará si tiene préstamos activos.
    const [result] = await pool.execute("DELETE FROM ejemplares WHERE id_ejemplar = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Ejemplar no encontrado." });
    }

    res.json({ message: "Ejemplar eliminado exitosamente." });
  } catch (error) {
    console.error("Error al eliminar ejemplar:", error);
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
         res.status(500).json({ error: "Error al eliminar ejemplar. Puede tener préstamos activos.", details: error.message });
    } else {
         res.status(500).json({ error: "Error interno del servidor al eliminar ejemplar.", details: error.message });
    }
  }
});

// ================================
// RUTAS PARA RESERVAS (Protegidas por autenticación)
// ================================

// GET - Obtener todas las reservas (requiere admin)
app.get("/reservas", authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    // Usar la vista para obtener información completa
    const [rows] = await pool.execute("SELECT * FROM v_reservas_completas");
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener reservas:", error);
    res.status(500).json({ error: "Error interno del servidor al obtener reservas.", details: error.message });
  }
});

// GET - Obtener reservas de un usuario específico (requiere ser el usuario o admin)
app.get("/reservas/usuario/:id_usuario", authenticateToken, async (req, res) => {
  try {
    const id_usuario = req.params.id_usuario;
    const requestingUserId = req.user.id;

    if (!id_usuario || isNaN(id_usuario)) {
        return res.status(400).json({ error: "ID de usuario inválido." });
    }

    // Permitir acceso si es admin o si es el mismo usuario
    if (req.user.role !== "admin" && requestingUserId != id_usuario) {
        return res.status(403).json({ error: "Acceso denegado." });
    }

    // Usar la vista para obtener información completa de las reservas del usuario
    const [rows] = await pool.execute("SELECT * FROM v_reservas_completas WHERE id_usuario = ?", [id_usuario]);

    res.json(rows);
  } catch (error) {
    console.error("Error al obtener reservas del usuario:", error);
    res.status(500).json({ error: "Error interno del servidor al obtener reservas del usuario.", details: error.message });
  }
});


// GET - Obtener una reserva por ID (requiere admin o ser el usuario dueño)
app.get("/reservas/:id", authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const requestingUserId = req.user.id;

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID de reserva inválido." });
    }

    const [rows] = await pool.execute("SELECT * FROM v_reservas_completas WHERE id_reserva = ?", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Reserva no encontrada." });
    }

    const reserva = rows[0];

    // Permitir acceso si es admin o si es el mismo usuario dueño
    if (req.user.role !== "admin" && requestingUserId != reserva.id_usuario) {
        return res.status(403).json({ error: "Acceso denegado." });
    }

    res.json(reserva);
  } catch (error) {
    console.error("Error al obtener reserva:", error);
    res.status(500).json({ error: "Error interno del servidor al obtener reserva.", details: error.message });
  }
});

// POST - Crear una nueva reserva (requiere autenticación)
app.post("/reservas", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id; // El ID del usuario autenticado
    const { id_libro, observaciones_usuario } = req.body;

    if (!id_libro) {
      return res.status(400).json({ error: "ID del libro es requerido." });
    }

    // Llamar al procedimiento almacenado para crear la reserva
    await pool.execute('CALL crear_reserva(?, ?, ?)', [userId, id_libro, observaciones_usuario || null]);

    res.status(201).json({ message: "Reserva creada exitosamente." });
  } catch (error) {
    console.error("Error al crear reserva:", error);
    // El procedimiento almacenado puede lanzar un error SQLSTATE '45000'
    if (error.sqlState === '45000') {
        res.status(400).json({ error: error.message }); // Mensaje del procedimiento
    } else {
        res.status(500).json({ error: "Error interno del servidor al crear reserva.", details: error.message });
    }
  }
});

// PUT - Aprobar una reserva (requiere admin)
app.put("/reservas/:id/aprobar", authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const adminId = req.user.id;
    const { observaciones_admin } = req.body; // Observaciones del admin

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID de reserva inválido." });
    }

    // Llamar al procedimiento almacenado para aprobar la reserva
    await pool.execute('CALL aprobar_reserva(?, ?, ?)', [id, adminId, observaciones_admin || null]);

    res.json({ message: "Reserva aprobada exitosamente." });
  } catch (error) {
    console.error("Error al aprobar reserva:", error);
    res.status(500).json({ error: "Error interno del servidor al aprobar reserva.", details: error.message });
  }
});

// PUT - Rechazar una reserva (requiere admin)
app.put("/reservas/:id/rechazar", authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const adminId = req.user.id;
    const { motivo } = req.body; // Motivo del rechazo

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID de reserva inválido." });
    }
    if (!motivo) {
        return res.status(400).json({ error: "Motivo del rechazo es requerido." });
    }

    // Llamar al procedimiento almacenado para rechazar la reserva
    await pool.execute('CALL rechazar_reserva(?, ?, ?)', [id, adminId, motivo]);

    res.json({ message: "Reserva rechazada exitosamente." });
  } catch (error) {
    console.error("Error al rechazar reserva:", error);
    res.status(500).json({ error: "Error interno del servidor al rechazar reserva.", details: error.message });
  }
});

// PUT - Cancelar una reserva (requiere ser el usuario dueño)
app.put("/reservas/:id/cancelar", authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.user.id;

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID de reserva inválido." });
    }

    // Verificar que el usuario sea el dueño de la reserva y que esté pendiente o aprobada
    const [reservaRows] = await pool.execute("SELECT id_usuario, estado FROM reservas WHERE id_reserva = ?", [id]);
    if (reservaRows.length === 0) {
        return res.status(404).json({ error: "Reserva no encontrada." });
    }
    const reserva = reservaRows[0];
    if (reserva.id_usuario != userId) {
        return res.status(403).json({ error: "Acceso denegado. No eres el dueño de esta reserva." });
    }
    // Opcional: Solo permitir cancelar si está pendiente o aprobada
    // if (reserva.estado !== 'pendiente' && reserva.estado !== 'aprobada') {
    //     return res.status(400).json({ error: "Solo se pueden cancelar reservas pendientes o aprobadas." });
    // }

    // Actualizar el estado de la reserva a 'cancelada'
    const [result] = await pool.execute(
        "UPDATE reservas SET estado = 'cancelada', updated_at = NOW() WHERE id_reserva = ? AND id_usuario = ?",
        [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Reserva no encontrada o no autorizada para cancelar." });
    }

    res.json({ message: "Reserva cancelada exitosamente." });
  } catch (error) {
    console.error("Error al cancelar reserva:", error);
    res.status(500).json({ error: "Error interno del servidor al cancelar reserva.", details: error.message });
  }
});


// DELETE - Eliminar una reserva (requiere admin)
app.delete("/reservas/:id", authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID de reserva inválido." });
    }

    // Solo se pueden eliminar reservas que no estén aprobadas o pendientes?
    // Aquí asumimos que se puede eliminar cualquier reserva si eres admin.
    // Puedes agregar lógica adicional si es necesario.
    const [result] = await pool.execute("DELETE FROM reservas WHERE id_reserva = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Reserva no encontrada." });
    }

    res.json({ message: "Reserva eliminada exitosamente." });
  } catch (error) {
    console.error("Error al eliminar reserva:", error);
    res.status(500).json({ error: "Error interno del servidor al eliminar reserva.", details: error.message });
  }
});

// ================================
// RUTAS PARA PRÉSTAMOS (Protegidas por autenticación y admin)
// ================================

// GET - Obtener todos los préstamos (requiere admin)
app.get("/prestamos", authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
        SELECT p.*, u.nombre_completo as nombre_usuario, e.codigo_ejemplar, l.titulo as titulo_libro, est.nombre as estado_nombre
        FROM prestamos p
        JOIN usuarios u ON p.id_usuario = u.id_usuario
        JOIN ejemplares e ON p.id_ejemplar = e.id_ejemplar
        JOIN libros l ON e.id_libro = l.id_libro
        JOIN estados est ON p.id_estado = est.id_estado
    `);
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener préstamos:", error);
    res.status(500).json({ error: "Error interno del servidor al obtener préstamos.", details: error.message });
  }
});

// GET - Obtener préstamos de un usuario específico (requiere ser el usuario o admin)
app.get("/prestamos/usuario/:id_usuario", authenticateToken, async (req, res) => {
  try {
    const id_usuario = req.params.id_usuario;
    const requestingUserId = req.user.id;

    if (!id_usuario || isNaN(id_usuario)) {
        return res.status(400).json({ error: "ID de usuario inválido." });
    }

    // Permitir acceso si es admin o si es el mismo usuario
    if (req.user.role !== "admin" && requestingUserId != id_usuario) {
        return res.status(403).json({ error: "Acceso denegado." });
    }

    const [rows] = await pool.execute(`
        SELECT p.*, e.codigo_ejemplar, l.titulo as titulo_libro, est.nombre as estado_nombre
        FROM prestamos p
        JOIN ejemplares e ON p.id_ejemplar = e.id_ejemplar
        JOIN libros l ON e.id_libro = l.id_libro
        JOIN estados est ON p.id_estado = est.id_estado
        WHERE p.id_usuario = ?
    `, [id_usuario]);

    res.json(rows);
  } catch (error) {
    console.error("Error al obtener préstamos del usuario:", error);
    res.status(500).json({ error: "Error interno del servidor al obtener préstamos del usuario.", details: error.message });
  }
});


// POST - Crear un nuevo préstamo (requiere admin, generalmente desde una reserva aprobada)
app.post("/prestamos", authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { id_reserva, id_ejemplar, dias_prestamo = 14 } = req.body; // Por defecto, 14 días

    if (!id_reserva && !id_ejemplar) {
      return res.status(400).json({ error: "Se requiere ID de reserva o ID de ejemplar." });
    }

    let id_usuario = null;
    let id_libro = null;
    if (id_reserva) {
        // Si se proporciona una reserva, usar el ID de usuario y libro de la reserva
        const [reservaRows] = await pool.execute("SELECT id_usuario, id_libro FROM reservas WHERE id_reserva = ?", [id_reserva]);
        if (reservaRows.length === 0) {
            return res.status(404).json({ error: "Reserva no encontrada." });
        }
        if (reservaRows[0].estado !== 'aprobada') {
            return res.status(400).json({ error: "La reserva no está aprobada." });
        }
        id_usuario = reservaRows[0].id_usuario;
        id_libro = reservaRows[0].id_libro;
    }

    // Si no se proporciona reserva, se necesita id_usuario e id_libro directamente
    if (!id_usuario && !req.body.id_usuario) {
        return res.status(400).json({ error: "ID de usuario es requerido si no se provee una reserva aprobada." });
    }
    if (!id_usuario) {
        id_usuario = req.body.id_usuario;
    }
    if (!id_libro && !id_ejemplar) { // Si no hay reserva ni ejemplar, no podemos saber el libro
        return res.status(400).json({ error: "ID del libro es requerido si no se provee una reserva." });
    }
    if (!id_libro && id_ejemplar) { // Obtener id_libro del ejemplar
        const [ejemplarRows] = await pool.execute("SELECT id_libro FROM ejemplares WHERE id_ejemplar = ?", [id_ejemplar]);
        if (ejemplarRows.length === 0) {
            return res.status(404).json({ error: "Ejemplar no encontrado." });
        }
        id_libro = ejemplarRows[0].id_libro;
    }


    if (!id_ejemplar) {
        return res.status(400).json({ error: "ID de ejemplar es requerido." });
    }

    // Verificar disponibilidad del ejemplar
    const [ejemplarRows] = await pool.execute("SELECT disponible FROM ejemplares WHERE id_ejemplar = ?", [id_ejemplar]);
    if (ejemplarRows.length === 0 || !ejemplarRows[0].disponible) {
        return res.status(400).json({ error: "El ejemplar no está disponible." });
    }

    // Obtener ID del estado "Prestado" (asumiendo que es el ID 1 según los datos iniciales)
    // Sería mejor obtenerlo dinámicamente
    const [estadoRows] = await pool.execute("SELECT id_estado FROM estados WHERE nombre = 'Prestado' AND tipo = 'prestamo' LIMIT 1");
    if (estadoRows.length === 0) {
        return res.status(500).json({ error: "Estado 'Prestado' no encontrado en la base de datos." });
    }
    const id_estado_prestado = estadoRows[0].id_estado;

    // Crear préstamo
    const [result] = await pool.execute(
      `INSERT INTO prestamos (id_usuario, id_ejemplar, id_reserva, fecha_devolucion_esperada, id_estado, admin_registro)
       VALUES (?, ?, ?, DATE_ADD(CURRENT_DATE, INTERVAL ? DAY), ?, ?)`,
      [id_usuario, id_ejemplar, id_reserva || null, dias_prestamo, id_estado_prestado, adminId]
    );

    // Actualizar disponibilidad del ejemplar
    await pool.execute("UPDATE ejemplares SET disponible = FALSE WHERE id_ejemplar = ?", [id_ejemplar]);

    // Actualizar disponibilidad en la tabla libros
    await pool.execute("UPDATE libros SET ejemplares_disponibles = ejemplares_disponibles - 1 WHERE id_libro = (SELECT id_libro FROM ejemplares WHERE id_ejemplar = ?)", [id_ejemplar]);

    // Si se creó desde una reserva, actualizar su estado a 'cumplida'
    if (id_reserva) {
        await pool.execute("UPDATE reservas SET estado = 'cumplida' WHERE id_reserva = ?", [id_reserva]);
    }

    const [newPrestamo] = await pool.execute(`
        SELECT p.*, u.nombre_completo as nombre_usuario, e.codigo_ejemplar, l.titulo as titulo_libro, est.nombre as estado_nombre
        FROM prestamos p
        JOIN usuarios u ON p.id_usuario = u.id_usuario
        JOIN ejemplares e ON p.id_ejemplar = e.id_ejemplar
        JOIN libros l ON e.id_libro = l.id_libro
        JOIN estados est ON p.id_estado = est.id_estado
        WHERE p.id_prestamo = ?
    `, [result.insertId]);

    res.status(201).json(newPrestamo[0]);
  } catch (error) {
    console.error("Error al crear préstamo:", error);
    res.status(500).json({ error: "Error interno del servidor al crear préstamo.", details: error.message });
  }
});

// PUT - Devolver un préstamo (requiere admin)
app.put("/prestamos/:id/devolver", authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const adminId = req.user.id;

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID de préstamo inválido." });
    }

    // Obtener ID del estado "Devuelto" (asumiendo que es el ID 2 según los datos iniciales)
    // Sería mejor obtenerlo dinámicamente
    const [estadoRows] = await pool.execute("SELECT id_estado FROM estados WHERE nombre = 'Devuelto' AND tipo = 'prestamo' LIMIT 1");
    if (estadoRows.length === 0) {
        return res.status(500).json({ error: "Estado 'Devuelto' no encontrado en la base de datos." });
    }
    const id_estado_devuelto = estadoRows[0].id_estado;

    // Actualizar préstamo
    const [result] = await pool.execute(
        "UPDATE prestamos SET fecha_devolucion_real = CURRENT_DATE, id_estado = ?, admin_registro = ? WHERE id_prestamo = ?",
        [id_estado_devuelto, adminId, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Préstamo no encontrado." });
    }

    // Obtener ID del ejemplar para actualizar su disponibilidad
    const [prestamoRows] = await pool.execute("SELECT id_ejemplar FROM prestamos WHERE id_prestamo = ?", [id]);
    const id_ejemplar = prestamoRows[0].id_ejemplar;

    // Actualizar disponibilidad del ejemplar
    await pool.execute("UPDATE ejemplares SET disponible = TRUE WHERE id_ejemplar = ?", [id_ejemplar]);

    // Actualizar disponibilidad en la tabla libros
    await pool.execute("UPDATE libros SET ejemplares_disponibles = ejemplares_disponibles + 1 WHERE id_libro = (SELECT id_libro FROM ejemplares WHERE id_ejemplar = ?)", [id_ejemplar]);

    res.json({ message: "Préstamo devuelto exitosamente." });
  } catch (error) {
    console.error("Error al devolver préstamo:", error);
    res.status(500).json({ error: "Error interno del servidor al devolver préstamo.", details: error.message });
  }
});

// ================================
// RUTAS PARA ESTADOS (Protegidas por autenticación y admin)
// ================================

// GET - Obtener todos los estados
app.get("/estados", authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT id_estado, nombre, descripcion, tipo, color, created_at FROM estados");
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener estados:", error);
    res.status(500).json({ error: "Error interno del servidor al obtener estados.", details: error.message });
  }
});

// POST - Crear un nuevo estado (requiere admin)
app.post("/estados", authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { nombre, descripcion, tipo, color } = req.body;

    if (!nombre || !tipo || !['prestamo', 'reserva'].includes(tipo)) {
      return res.status(400).json({ error: "Nombre, tipo ('prestamo' o 'reserva') son requeridos." });
    }

    const createdAt = new Date();
    const updatedAt = new Date();

    const [result] = await pool.execute(
      `INSERT INTO estados (nombre, descripcion, tipo, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre, descripcion || null, tipo, color || null, createdAt, updatedAt]
    );

    const [newEstado] = await pool.execute(
      "SELECT id_estado, nombre, descripcion, tipo, color, created_at FROM estados WHERE id_estado = ?",
      [result.insertId]
    );

    res.status(201).json(newEstado[0]);
  } catch (error) {
    console.error("Error al crear estado:", error);
    if (error.code === 'ER_DUP_ENTRY') {
        res.status(400).json({ error: "El nombre del estado ya existe.", details: error.message });
    } else {
        res.status(500).json({ error: "Error interno del servidor al crear estado.", details: error.message });
    }
  }
});

// PUT - Actualizar un estado (requiere admin)
app.put("/estados/:id", authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const estadoId = req.params.id;
    const { nombre, descripcion, tipo, color } = req.body;

    if (!estadoId || isNaN(estadoId)) {
        return res.status(400).json({ error: "ID de estado inválido." });
    }
    if (!nombre || !tipo || !['prestamo', 'reserva'].includes(tipo)) {
      return res.status(400).json({ error: "Nombre, tipo ('prestamo' o 'reserva') son requeridos." });
    }

    const updatedAt = new Date();

    const [result] = await pool.execute(
      "UPDATE estados SET nombre = ?, descripcion = ?, tipo = ?, color = ?, updated_at = ? WHERE id_estado = ?",
      [nombre, descripcion || null, tipo, color || null, updatedAt, estadoId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Estado no encontrado." });
    }

    const [updatedEstado] = await pool.execute(
      "SELECT id_estado, nombre, descripcion, tipo, color, created_at FROM estados WHERE id_estado = ?",
      [estadoId]
    );

    res.json(updatedEstado[0]);
  } catch (error) {
    console.error("Error al actualizar estado:", error);
    if (error.code === 'ER_DUP_ENTRY') {
        res.status(400).json({ error: "El nombre del estado ya existe.", details: error.message });
    } else {
        res.status(500).json({ error: "Error interno del servidor al actualizar estado.", details: error.message });
    }
  }
});

// DELETE - Eliminar un estado (requiere admin)
app.delete("/estados/:id", authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const estadoId = req.params.id;
    if (!estadoId || isNaN(estadoId)) {
        return res.status(400).json({ error: "ID de estado inválido." });
    }

    // IMPORTANTE: Debido a ON DELETE RESTRICT en préstamos y ON DELETE CASCADE en reservas,
    // eliminar un estado puede fallar si hay préstamos asociados a él.
    const [result] = await pool.execute(
      "DELETE FROM estados WHERE id_estado = ?",
      [estadoId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Estado no encontrado." });
    }

    res.json({ message: "Estado eliminado exitosamente." });
  } catch (error) {
    console.error("Error al eliminar estado:", error);
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
         res.status(500).json({ error: "Error al eliminar estado. Puede tener préstamos asociados.", details: error.message });
    } else {
         res.status(500).json({ error: "Error interno del servidor al eliminar estado.", details: error.message });
    }
  }
});

// ================================
// RUTAS PARA HISTORIAL DE RESERVAS (Protegidas por autenticación y admin)
// ================================

// GET - Obtener historial de una reserva específica (requiere admin o ser el usuario dueño)
app.get("/historial_reservas/:id_reserva", authenticateToken, async (req, res) => {
  try {
    const id_reserva = req.params.id_reserva;
    const requestingUserId = req.user.id;

    if (!id_reserva || isNaN(id_reserva)) {
        return res.status(400).json({ error: "ID de reserva inválido." });
    }

    const [rows] = await pool.execute(`
        SELECT hr.*, u.nombre_completo as nombre_usuario_responsable
        FROM historial_reservas hr
        LEFT JOIN usuarios u ON hr.usuario_responsable = u.id_usuario
        WHERE hr.id_reserva = ?
    `, [id_reserva]);

    if (rows.length === 0) {
        // Puede que la reserva no exista o no tenga historial
        // Verificar si la reserva existe y si el usuario tiene permiso
        const [reservaRows] = await pool.execute("SELECT id_usuario FROM reservas WHERE id_reserva = ?", [id_reserva]);
        if (reservaRows.length === 0) {
            return res.status(404).json({ error: "Reserva no encontrada." });
        }
        if (req.user.role !== "admin" && reservaRows[0].id_usuario != requestingUserId) {
            return res.status(403).json({ error: "Acceso denegado." });
        }
        // Si la reserva existe y tiene permiso, pero no hay historial, devolver array vacío
        return res.json([]);
    }

    // Verificar permiso para ver el historial
    if (req.user.role !== "admin" && rows[0].id_usuario != requestingUserId) {
        return res.status(403).json({ error: "Acceso denegado." });
    }

    res.json(rows);
  } catch (error) {
    console.error("Error al obtener historial de reserva:", error);
    res.status(500).json({ error: "Error interno del servidor al obtener historial de reserva.", details: error.message });
  }
};

// ================================
// RUTAS PARA NOTIFICACIONES (Protegidas por autenticación)
// ================================

// GET - Obtener notificaciones de un usuario (requiere ser el usuario o admin)
app.get("/notificaciones/:id_usuario", authenticateToken, async (req, res) => {
  try {
    const id_usuario = req.params.id_usuario;
    const requestingUserId = req.user.id;

    if (!id_usuario || isNaN(id_usuario)) {
        return res.status(400).json({ error: "ID de usuario inválido." });
    }

    // Permitir acceso si es admin o si es el mismo usuario
    if (req.user.role !== "admin" && requestingUserId != id_usuario) {
        return res.status(403).json({ error: "Acceso denegado." });
    }

    const [rows] = await pool.execute(
      "SELECT id_notificacion, tipo, asunto, mensaje, leida, created_at FROM notificaciones WHERE id_usuario = ? ORDER BY created_at DESC",
      [id_usuario]
    );

    res.json(rows);
  } catch (error) {
    console.error("Error al obtener notificaciones:", error);
    res.status(500).json({ error: "Error interno del servidor al obtener notificaciones.", details: error.message });
  }
});

// PUT - Marcar una notificación como leída (requiere ser el usuario dueño)
app.put("/notificaciones/:id_usuario/:id_notificacion/leida", authenticateToken, async (req, res) => {
  try {
    const id_usuario = req.params.id_usuario;
    const id_notificacion = req.params.id_notificacion;
    const requestingUserId = req.user.id;

    if (!id_usuario || isNaN(id_usuario) || !id_notificacion || isNaN(id_notificacion)) {
        return res.status(400).json({ error: "ID de usuario o ID de notificación inválidos." });
    }

    // Permitir acceso si es el mismo usuario dueño
    if (requestingUserId != id_usuario) {
        return res.status(403).json({ error: "Acceso denegado." });
    }

    const [result] = await pool.execute(
      "UPDATE notificaciones SET leida = TRUE WHERE id_notificacion = ? AND id_usuario = ?",
      [id_notificacion, id_usuario]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Notificación no encontrada o no autorizada." });
    }

    res.json({ message: "Notificación marcada como leída." });
  } catch (error) {
    console.error("Error al marcar notificación como leída:", error);
    res.status(500).json({ error: "Error interno del servidor al marcar notificación como leída.", details: error.message });
  }
});

// ================================
// RUTAS PARA FAVORITOS/RESEÑAS (Usuario-Libros) (Protegidas por autenticación)
// ================================

// GET - Obtener libros favoritos de un usuario (requiere ser el usuario o admin)
app.get("/usuarios/:id_usuario/favoritos", authenticateToken, async (req, res) => {
  try {
    const id_usuario = req.params.id_usuario;
    const requestingUserId = req.user.id;

    if (!id_usuario || isNaN(id_usuario)) {
        return res.status(400).json({ error: "ID de usuario inválido." });
    }

    // Permitir acceso si es admin o si es el mismo usuario
    if (req.user.role !== "admin" && requestingUserId != id_usuario) {
        return res.status(403).json({ error: "Acceso denegado." });
    }

    const [rows] = await pool.execute(`
        SELECT ul.id_libro, l.titulo, l.autor, l.portada_url, ul.fecha_agregado, ul.calificacion, ul.resena
        FROM usuario_libros ul
        JOIN libros l ON ul.id_libro = l.id_libro
        WHERE ul.id_usuario = ?
    `, [id_usuario]);

    res.json(rows);
  } catch (error) {
    console.error("Error al obtener favoritos del usuario:", error);
    res.status(500).json({ error: "Error interno del servidor al obtener favoritos del usuario.", details: error.message });
  }
};

// POST - Agregar libro a favoritos (requiere ser el usuario)
app.post("/usuarios/:id_usuario/favoritos", authenticateToken, async (req, res) => {
  try {
    const id_usuario = req.params.id_usuario;
    const requestingUserId = req.user.id;
    const { id_libro, calificacion, resena } = req.body;

    if (requestingUserId != id_usuario) {
        return res.status(403).json({ error: "Acceso denegado." });
    }
    if (!id_libro) {
        return res.status(400).json({ error: "ID de libro es requerido." });
    }
    if (calificacion && (calificacion < 1 || calificacion > 5)) {
        return res.status(400).json({ error: "La calificación debe estar entre 1 y 5." });
    }

    // Verificar que el libro exista
    const [libroRows] = await pool.execute("SELECT id_libro FROM libros WHERE id_libro = ?", [id_libro]);
    if (libroRows.length === 0) {
        return res.status(404).json({ error: "Libro no encontrado." });
    }

    const [result] = await pool.execute(
      `INSERT INTO usuario_libros (id_usuario, id_libro, calificacion, resena)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE calificacion = VALUES(calificacion), resena = VALUES(resena)`, // Upsert
      [id_usuario, id_libro, calificacion || null, resena || null]
    );

    res.status(201).json({ message: "Libro agregado/actualizado en favoritos." });
  } catch (error) {
    console.error("Error al agregar libro a favoritos:", error);
    res.status(500).json({ error: "Error interno del servidor al agregar libro a favoritos.", details: error.message });
  }
};

// DELETE - Eliminar libro de favoritos (requiere ser el usuario)
app.delete("/usuarios/:id_usuario/favoritos/:id_libro", authenticateToken, async (req, res) => {
  try {
    const id_usuario = req.params.id_usuario;
    const id_libro = req.params.id_libro;
    const requestingUserId = req.user.id;

    if (requestingUserId != id_usuario) {
        return res.status(403).json({ error: "Acceso denegado." });
    }
    if (!id_libro) {
        return res.status(400).json({ error: "ID de libro es requerido." });
    }

    const [result] = await pool.execute(
      "DELETE FROM usuario_libros WHERE id_usuario = ? AND id_libro = ?",
      [id_usuario, id_libro]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Favorito no encontrado o no autorizado para eliminar." });
    }

    res.json({ message: "Libro eliminado de favoritos." });
  } catch (error) {
    console.error("Error al eliminar libro de favoritos:", error);
    res.status(500).json({ error: "Error interno del servidor al eliminar libro de favoritos.", details: error.message });
  }
};

// ================================
// RUTAS PARA ESTADÍSTICAS (Protegidas por autenticación y admin)
// ================================

// GET - Obtener estadísticas generales (requiere admin)
app.get("/estadisticas/generales", authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    // Usar la vista para obtener estadísticas
    const [rows] = await pool.execute("SELECT * FROM v_estadisticas_generales LIMIT 1");
    if (rows.length > 0) {
        res.json(rows[0]);
    } else {
        res.status(500).json({ error: "Error al obtener estadísticas generales." });
    }
  } catch (error) {
    console.error("Error al obtener estadísticas generales:", error);
    res.status(500).json({ error: "Error interno del servidor al obtener estadísticas generales.", details: error.message });
  }
});

// GET - Obtener libros más reservados (requiere admin)
app.get("/estadisticas/libros_mas_reservados", authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    // Usar la vista para obtener libros más reservados
    const [rows] = await pool.execute("SELECT id_libro, titulo, autor, isbn, genero, total_reservas, reservas_pendientes FROM v_libros_mas_reservados LIMIT 10");
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener libros más reservados:", error);
    res.status(500).json({ error: "Error interno del servidor al obtener libros más reservados.", details: error.message });
  }
});

// ================================
// Middleware de manejo de errores 404
// ================================
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada." });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

export default app;