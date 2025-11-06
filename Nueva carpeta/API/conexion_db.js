// API/conexion_db.js
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// Validación de variables de entorno críticas
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASS', 'DB_NAME'];
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    console.error(`Error: La variable de entorno ${varName} es obligatoria.`);
    process.exit(1); // Detiene la ejecución si falta una variable crítica
  }
}

// Configuración de la base de datos
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS, // Nota: Usas DB_PASS aquí, no DB_PASSWORD
  database: process.env.DB_NAME,
  connectionLimit: 10, // Controls the number of active connections at the same time
  waitForConnections: true, // When the connection limit is reached, if set to true, users will be placed
  queueLimit: 0, // Maximum number of requests waiting (0 = no limit)
  // Opcional: Añadir timeouts para mayor robustez
  acquireTimeout: 60000,
  timeout: 60000,
};

export const pool = mysql.createPool(dbConfig);

// Función para probar la conexión
async function checkConnection() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log("✅ Conexión exitosa a la base de datos");

    // Hacemos un "ping" para probar
    await connection.ping();
    console.log("📡 El servidor respondió correctamente");

    await connection.end();
  } catch (error) {
    console.error("❌ Error al conectar a la base de datos:", error.message);
    process.exit(1); // Detiene la ejecución si falla la conexión inicial
  }
}

// Ejecutar la verificación de conexión al cargar este módulo
// Si no quieres que se ejecute inmediatamente, puedes exportar la función y llamarla desde otro lado
// export { checkConnection }; // Descomenta esta línea y comenta la siguiente si prefieres llamarla manualmente
checkConnection();
