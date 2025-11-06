-- Crear base de datos si no existe
CREATE DATABASE IF NOT EXISTS biblioteca;
USE biblioteca;

-- ============================
-- ELIMINACIÓN EN ORDEN CORRECTO
-- ============================
DROP TABLE IF EXISTS notificaciones;
DROP TABLE IF EXISTS historial_reservas;
DROP TABLE IF EXISTS reservas;
DROP TABLE IF EXISTS prestamos;
DROP TABLE IF EXISTS usuario_libros;
DROP TABLE IF EXISTS ejemplares;
DROP TABLE IF EXISTS libros;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS estados;

-- ============================
-- CREACIÓN DE TABLAS
-- ============================

-- 1) Tabla de usuarios con roles
CREATE TABLE usuarios (
  id_usuario INT PRIMARY KEY AUTO_INCREMENT,
  nombre_completo VARCHAR(225) NOT NULL,
  password VARCHAR(225) NOT NULL,
  identificacion VARCHAR(50) UNIQUE NOT NULL,
  correo VARCHAR(225) NOT NULL UNIQUE,
  telefono VARCHAR(20),
  direccion VARCHAR(500),
  role ENUM('admin', 'estudiante') NOT NULL DEFAULT 'estudiante',
  estado_cuenta ENUM('activo', 'suspendido', 'inactivo') DEFAULT 'activo',
  fecha_registro DATE DEFAULT (CURRENT_DATE),
  foto_perfil VARCHAR(500),
  max_prestamos INT DEFAULT 3,
  max_reservas INT DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2) Tabla de estados
CREATE TABLE estados (
  id_estado INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  descripcion VARCHAR(225),
  tipo ENUM('prestamo', 'reserva') NOT NULL,
  color VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3) Tabla de libros
CREATE TABLE libros (
  id_libro INT PRIMARY KEY AUTO_INCREMENT,
  isbn VARCHAR(50) UNIQUE NOT NULL,
  titulo VARCHAR(225) NOT NULL,
  autor VARCHAR(225) NOT NULL,
  editorial VARCHAR(225),
  anio_publicacion INT,
  genero VARCHAR(100),
  descripcion TEXT,
  portada_url VARCHAR(500),
  link VARCHAR(500),
  idioma VARCHAR(50) DEFAULT 'Español',
  num_paginas INT,
  total_ejemplares INT DEFAULT 1,
  ejemplares_disponibles INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4) Tabla de ejemplares (copias físicas)
CREATE TABLE ejemplares (
  id_ejemplar INT PRIMARY KEY AUTO_INCREMENT,
  id_libro INT NOT NULL,
  codigo_ejemplar VARCHAR(50) UNIQUE NOT NULL,
  ubicacion VARCHAR(100),
  estado_fisico ENUM('excelente', 'bueno', 'regular', 'malo') DEFAULT 'bueno',
  disponible BOOLEAN DEFAULT TRUE,
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (id_libro) REFERENCES libros(id_libro) ON DELETE CASCADE ON UPDATE CASCADE
);

-- 5) Tabla de reservas (NUEVA Y MEJORADA)
CREATE TABLE reservas (
  id_reserva INT PRIMARY KEY AUTO_INCREMENT,
  id_usuario INT NOT NULL,
  id_libro INT NOT NULL,
  fecha_reserva TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_expiracion TIMESTAMP NOT NULL,
  estado ENUM('pendiente', 'aprobada', 'rechazada', 'cumplida', 'cancelada', 'expirada') DEFAULT 'pendiente',
  prioridad INT DEFAULT 0,
  observaciones_usuario TEXT,
  observaciones_admin TEXT,
  notificacion_enviada BOOLEAN DEFAULT FALSE,
  fecha_aprobacion TIMESTAMP NULL,
  admin_aprobador INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (id_libro) REFERENCES libros(id_libro) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (admin_aprobador) REFERENCES usuarios(id_usuario) ON DELETE SET NULL ON UPDATE CASCADE
);

-- 6) Tabla de préstamos
CREATE TABLE prestamos (
  id_prestamo INT PRIMARY KEY AUTO_INCREMENT,
  id_usuario INT NOT NULL,
  id_ejemplar INT NOT NULL,
  id_reserva INT NULL,
  fecha_prestamo DATE NOT NULL DEFAULT (CURRENT_DATE),
  fecha_devolucion_esperada DATE NOT NULL,
  fecha_devolucion_real DATE NULL,
  id_estado INT NOT NULL,
  renovaciones INT DEFAULT 0,
  max_renovaciones INT DEFAULT 2,
  observaciones TEXT,
  admin_registro INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (id_ejemplar) REFERENCES ejemplares(id_ejemplar) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (id_reserva) REFERENCES reservas(id_reserva) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (id_estado) REFERENCES estados(id_estado) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (admin_registro) REFERENCES usuarios(id_usuario) ON DELETE SET NULL ON UPDATE CASCADE
);

-- 7) Tabla de historial de reservas (auditoría)
CREATE TABLE historial_reservas (
  id_historial INT PRIMARY KEY AUTO_INCREMENT,
  id_reserva INT NOT NULL,
  accion VARCHAR(100) NOT NULL,
  estado_anterior VARCHAR(50),
  estado_nuevo VARCHAR(50),
  usuario_responsable INT,
  detalles TEXT,
  fecha_accion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (id_reserva) REFERENCES reservas(id_reserva) ON DELETE CASCADE,
  FOREIGN KEY (usuario_responsable) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);

-- 8) Tabla de notificaciones (para correos y alertas)
CREATE TABLE notificaciones (
  id_notificacion INT PRIMARY KEY AUTO_INCREMENT,
  id_usuario INT NOT NULL,
  tipo ENUM('reserva_aprobada', 'reserva_rechazada', 'reserva_expirada', 'prestamo_proximo', 'prestamo_vencido', 'libro_disponible') NOT NULL,
  asunto VARCHAR(225) NOT NULL,
  mensaje TEXT NOT NULL,
  leida BOOLEAN DEFAULT FALSE,
  enviada_email BOOLEAN DEFAULT FALSE,
  fecha_envio_email TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

-- 9) Tabla intermedia usuario-libros (favoritos)
CREATE TABLE usuario_libros (
  id_usuario INT NOT NULL,
  id_libro INT NOT NULL,
  fecha_agregado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  calificacion INT CHECK (calificacion BETWEEN 1 AND 5),
  resena TEXT,
  PRIMARY KEY (id_usuario, id_libro),
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  FOREIGN KEY (id_libro) REFERENCES libros(id_libro) ON DELETE CASCADE
);

-- ============================
-- ÍNDICES PARA RENDIMIENTO
-- ============================
CREATE INDEX idx_reservas_usuario ON reservas(id_usuario);
CREATE INDEX idx_reservas_libro ON reservas(id_libro);
CREATE INDEX idx_reservas_estado ON reservas(estado);
CREATE INDEX idx_reservas_fecha ON reservas(fecha_reserva);
CREATE INDEX idx_prestamos_usuario ON prestamos(id_usuario);
CREATE INDEX idx_prestamos_ejemplar ON prestamos(id_ejemplar);
CREATE INDEX idx_prestamos_estado ON prestamos(id_estado);
CREATE INDEX idx_notificaciones_usuario ON notificaciones(id_usuario);
CREATE INDEX idx_notificaciones_leida ON notificaciones(leida);
CREATE INDEX idx_libros_titulo ON libros(titulo);
CREATE INDEX idx_libros_disponibles ON libros(ejemplares_disponibles);

-- ============================
-- DATOS INICIALES
-- ============================

-- Estados de préstamos
INSERT INTO estados (nombre, descripcion, tipo, color) VALUES
('Prestado', 'El libro está actualmente prestado', 'prestamo', '#FFA500'),
('Devuelto', 'El libro ha sido devuelto', 'prestamo', '#28A745'),
('Retrasado', 'La devolución está retrasada', 'prestamo', '#DC3545'),
('Renovado', 'El préstamo ha sido renovado', 'prestamo', '#17A2B8');

-- Estados de reservas
INSERT INTO estados (nombre, descripcion, tipo, color) VALUES
('Pendiente', 'Reserva pendiente de aprobación', 'reserva', '#FFC107'),
('Aprobada', 'Reserva aprobada por administrador', 'reserva', '#28A745'),
('Rechazada', 'Reserva rechazada', 'reserva', '#DC3545'),
('Cumplida', 'Reserva cumplida - libro prestado', 'reserva', '#6C757D'),
('Cancelada', 'Reserva cancelada por el usuario', 'reserva', '#6C757D'),
('Expirada', 'Reserva expirada por tiempo', 'reserva', '#DC3545');

-- Usuario administrador por defecto (password: admin123 - debes encriptarlo)
INSERT INTO usuarios (nombre_completo, password, identificacion, correo, telefono, role) VALUES
('Administrador Sistema', 'admin123', '0000000000', 'admin@biblioteca.com', '1234567890', 'admin');

-- Usuario estudiante de ejemplo
INSERT INTO usuarios (nombre_completo, password, identificacion, correo, telefono, role) VALUES
('Juan Estudiante', 'estudiante123', '1234567890', 'juan@estudiante.com', '0987654321', 'estudiante');

-- ============================
-- VISTAS ÚTILES
-- ============================

-- Vista de reservas con información completa
CREATE VIEW v_reservas_completas AS
SELECT 
  r.id_reserva,
  r.estado,
  r.fecha_reserva,
  r.fecha_expiracion,
  r.prioridad,
  r.observaciones_usuario,
  r.observaciones_admin,
  u.id_usuario,
  u.nombre_completo AS nombre_usuario,
  u.correo AS correo_usuario,
  u.telefono AS telefono_usuario,
  u.identificacion,
  l.id_libro,
  l.titulo,
  l.autor,
  l.isbn,
  l.portada_url,
  l.ejemplares_disponibles,
  DATEDIFF(r.fecha_expiracion, NOW()) AS dias_restantes,
  admin.nombre_completo AS admin_aprobador_nombre
FROM reservas r
JOIN usuarios u ON r.id_usuario = u.id_usuario
JOIN libros l ON r.id_libro = l.id_libro
LEFT JOIN usuarios admin ON r.admin_aprobador = admin.id_usuario;

-- Vista de libros más reservados
CREATE VIEW v_libros_mas_reservados AS
SELECT 
  l.id_libro,
  l.titulo,
  l.autor,
  l.isbn,
  l.genero,
  l.ejemplares_disponibles,
  l.total_ejemplares,
  COUNT(r.id_reserva) AS total_reservas,
  COUNT(CASE WHEN r.estado = 'pendiente' THEN 1 END) AS reservas_pendientes
FROM libros l
LEFT JOIN reservas r ON l.id_libro = r.id_libro
GROUP BY l.id_libro, l.titulo, l.autor, l.isbn, l.genero, l.ejemplares_disponibles, l.total_ejemplares
ORDER BY total_reservas DESC;

-- Vista de usuarios con más reservas
CREATE VIEW v_usuarios_reservas AS
SELECT 
  u.id_usuario,
  u.nombre_completo,
  u.correo,
  u.identificacion,
  u.role,
  COUNT(CASE WHEN r.estado = 'pendiente' THEN 1 END) AS reservas_pendientes,
  COUNT(CASE WHEN r.estado = 'aprobada' THEN 1 END) AS reservas_aprobadas,
  COUNT(r.id_reserva) AS total_reservas_historico
FROM usuarios u
LEFT JOIN reservas r ON u.id_usuario = r.id_usuario
GROUP BY u.id_usuario, u.nombre_completo, u.correo, u.identificacion, u.role;

-- Vista de estadísticas generales
CREATE VIEW v_estadisticas_generales AS
SELECT 
  (SELECT COUNT(*) FROM usuarios WHERE role = 'estudiante') AS total_estudiantes,
  (SELECT COUNT(*) FROM usuarios WHERE role = 'admin') AS total_admins,
  (SELECT COUNT(*) FROM libros) AS total_libros,
  (SELECT SUM(total_ejemplares) FROM libros) AS total_ejemplares,
  (SELECT SUM(ejemplares_disponibles) FROM libros) AS ejemplares_disponibles,
  (SELECT COUNT(*) FROM reservas WHERE estado = 'pendiente') AS reservas_pendientes,
  (SELECT COUNT(*) FROM reservas WHERE estado = 'aprobada') AS reservas_aprobadas,
  (SELECT COUNT(*) FROM prestamos WHERE fecha_devolucion_real IS NULL) AS prestamos_activos;

-- ============================
-- PROCEDIMIENTOS ALMACENADOS
-- ============================

DELIMITER //

-- Procedimiento para crear una reserva
CREATE PROCEDURE crear_reserva(
  IN p_id_usuario INT,
  IN p_id_libro INT,
  IN p_observaciones TEXT
)
BEGIN
  DECLARE v_reservas_activas INT;
  DECLARE v_max_reservas INT;
  DECLARE v_ejemplares_disponibles INT;
  DECLARE v_titulo_libro VARCHAR(225);
  
  -- Obtener límite de reservas del usuario
  SELECT max_reservas INTO v_max_reservas
  FROM usuarios WHERE id_usuario = p_id_usuario;
  
  -- Contar reservas activas (pendientes o aprobadas)
  SELECT COUNT(*) INTO v_reservas_activas
  FROM reservas 
  WHERE id_usuario = p_id_usuario 
  AND estado IN ('pendiente', 'aprobada');
  
  -- Verificar disponibilidad
  SELECT ejemplares_disponibles, titulo INTO v_ejemplares_disponibles, v_titulo_libro
  FROM libros WHERE id_libro = p_id_libro;
  
  -- Validaciones
  IF v_reservas_activas >= v_max_reservas THEN
    SIGNAL SQLSTATE '45000' 
    SET MESSAGE_TEXT = 'Has alcanzado el límite de reservas activas';
  ELSE
    -- Crear reserva
    INSERT INTO reservas (id_usuario, id_libro, fecha_expiracion, observaciones_usuario, estado)
    VALUES (
      p_id_usuario, 
      p_id_libro, 
      DATE_ADD(NOW(), INTERVAL 7 DAY),
      p_observaciones,
      'pendiente'
    );
    
    -- Crear notificación para el usuario
    INSERT INTO notificaciones (id_usuario, tipo, asunto, mensaje)
    VALUES (
      p_id_usuario,
      'reserva_aprobada',
      'Reserva creada exitosamente',
      CONCAT('Tu reserva del libro "', v_titulo_libro, '" ha sido registrada y está pendiente de aprobación.')
    );
    
    -- Registrar en historial
    INSERT INTO historial_reservas (id_reserva, accion, estado_nuevo, usuario_responsable, detalles)
    VALUES (
      LAST_INSERT_ID(),
      'RESERVA_CREADA',
      'pendiente',
      p_id_usuario,
      'Reserva creada por el usuario'
    );
  END IF;
END //

-- Procedimiento para aprobar reserva (ADMIN)
CREATE PROCEDURE aprobar_reserva(
  IN p_id_reserva INT,
  IN p_id_admin INT,
  IN p_observaciones TEXT
)
BEGIN
  DECLARE v_id_usuario INT;
  DECLARE v_titulo_libro VARCHAR(225);
  DECLARE v_correo_usuario VARCHAR(225);
  
  -- Obtener información
  SELECT r.id_usuario, l.titulo, u.correo
  INTO v_id_usuario, v_titulo_libro, v_correo_usuario
  FROM reservas r
  JOIN libros l ON r.id_libro = l.id_libro
  JOIN usuarios u ON r.id_usuario = u.id_usuario
  WHERE r.id_reserva = p_id_reserva;
  
  -- Actualizar reserva
  UPDATE reservas 
  SET estado = 'aprobada',
      admin_aprobador = p_id_admin,
      fecha_aprobacion = NOW(),
      observaciones_admin = p_observaciones,
      fecha_expiracion = DATE_ADD(NOW(), INTERVAL 3 DAY)
  WHERE id_reserva = p_id_reserva;
  
  -- Crear notificación
  INSERT INTO notificaciones (id_usuario, tipo, asunto, mensaje, enviada_email)
  VALUES (
    v_id_usuario,
    'reserva_aprobada',
    'Reserva Aprobada',
    CONCAT('Tu reserva del libro "', v_titulo_libro, '" ha sido aprobada. Tienes 3 días para recogerlo.'),
    FALSE
  );
  
  -- Registrar en historial
  INSERT INTO historial_reservas (id_reserva, accion, estado_anterior, estado_nuevo, usuario_responsable, detalles)
  VALUES (
    p_id_reserva,
    'RESERVA_APROBADA',
    'pendiente',
    'aprobada',
    p_id_admin,
    p_observaciones
  );
END //

-- Procedimiento para rechazar reserva (ADMIN)
CREATE PROCEDURE rechazar_reserva(
  IN p_id_reserva INT,
  IN p_id_admin INT,
  IN p_motivo TEXT
)
BEGIN
  DECLARE v_id_usuario INT;
  DECLARE v_titulo_libro VARCHAR(225);
  
  SELECT r.id_usuario, l.titulo
  INTO v_id_usuario, v_titulo_libro
  FROM reservas r
  JOIN libros l ON r.id_libro = l.id_libro
  WHERE r.id_reserva = p_id_reserva;
  
  UPDATE reservas 
  SET estado = 'rechazada',
      admin_aprobador = p_id_admin,
      observaciones_admin = p_motivo
  WHERE id_reserva = p_id_reserva;
  
  INSERT INTO notificaciones (id_usuario, tipo, asunto, mensaje)
  VALUES (
    v_id_usuario,
    'reserva_rechazada',
    'Reserva Rechazada',
    CONCAT('Tu reserva del libro "', v_titulo_libro, '" ha sido rechazada. Motivo: ', p_motivo)
  );
  
  INSERT INTO historial_reservas (id_reserva, accion, estado_anterior, estado_nuevo, usuario_responsable, detalles)
  VALUES (p_id_reserva, 'RESERVA_RECHAZADA', 'pendiente', 'rechazada', p_id_admin, p_motivo);
END //

-- Procedimiento para crear préstamo desde reserva
CREATE PROCEDURE crear_prestamo_desde_reserva(
  IN p_id_reserva INT,
  IN p_id_ejemplar INT,
  IN p_dias_prestamo INT,
  IN p_id_admin INT
)
BEGIN
  DECLARE v_id_usuario INT;
  DECLARE v_id_libro INT;
  
  SELECT id_usuario, id_libro INTO v_id_usuario, v_id_libro
  FROM reservas WHERE id_reserva = p_id_reserva;
  
  -- Crear préstamo
  INSERT INTO prestamos (id_usuario, id_ejemplar, id_reserva, fecha_devolucion_esperada, id_estado, admin_registro)
  VALUES (
    v_id_usuario,
    p_id_ejemplar,
    p_id_reserva,
    DATE_ADD(CURRENT_DATE, INTERVAL p_dias_prestamo DAY),
    1,
    p_id_admin
  );
  
  -- Actualizar reserva a cumplida
  UPDATE reservas SET estado = 'cumplida' WHERE id_reserva = p_id_reserva;
  
  -- Actualizar disponibilidad
  UPDATE ejemplares SET disponible = FALSE WHERE id_ejemplar = p_id_ejemplar;
  UPDATE libros SET ejemplares_disponibles = ejemplares_disponibles - 1 
  WHERE id_libro = v_id_libro;
END //

DELIMITER ;

-- ============================
-- TRIGGERS
-- ============================

DELIMITER //

-- Trigger para expirar reservas automáticamente
CREATE TRIGGER verificar_expiracion_reserva
BEFORE UPDATE ON reservas
FOR EACH ROW
BEGIN
  IF NEW.estado IN ('pendiente', 'aprobada') 
     AND NEW.fecha_expiracion < NOW() THEN
    SET NEW.estado = 'expirada';
  END IF;
END //

-- Trigger para actualizar contador de ejemplares al crear uno nuevo
CREATE TRIGGER actualizar_total_ejemplares_insert
AFTER INSERT ON ejemplares
FOR EACH ROW
BEGIN
  UPDATE libros 
  SET total_ejemplares = total_ejemplares + 1,
      ejemplares_disponibles = ejemplares_disponibles + 1
  WHERE id_libro = NEW.id_libro;
END //

-- Trigger para actualizar contador al eliminar ejemplar
CREATE TRIGGER actualizar_total_ejemplares_delete
AFTER DELETE ON ejemplares
FOR EACH ROW
BEGIN
  UPDATE libros 
  SET total_ejemplares = total_ejemplares - 1,
      ejemplares_disponibles = GREATEST(0, ejemplares_disponibles - 1)
  WHERE id_libro = OLD.id_libro;
END //

DELIMITER ;

-- ============================
-- CONSULTAS ÚTILES
-- ============================

-- Ver todas las reservas con información completa
-- SELECT * FROM v_reservas_completas;

-- Ver reservas pendientes de aprobación
-- SELECT * FROM v_reservas_completas WHERE estado = 'pendiente' ORDER BY fecha_reserva ASC;

-- Ver estadísticas generales
-- SELECT * FROM v_estadisticas_generales;

-- Ver libros más reservados
-- SELECT * FROM v_libros_mas_reservados LIMIT 10;

-- Crear una reserva
-- CALL crear_reserva(2, 1, 'Necesito este libro para mi tesis');

-- Aprobar una reserva
-- CALL aprobar_reserva(1, 1, 'Reserva aprobada, libro disponible');

-- Rechazar una reserva
-- CALL rechazar_reserva(1, 1, 'No hay ejemplares disponibles actualmente');