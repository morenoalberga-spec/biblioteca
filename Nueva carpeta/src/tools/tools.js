// src/tools/tools.js

// Función para verificar si el usuario está autenticado
// Ahora se basa en la existencia y validez del token JWT
function isAuthenticated() {
  const token = localStorage.getItem('token');
  // Opcional: Puedes agregar lógica para verificar si el token ha expirado
  // usando jwt-decode o verificando la fecha manualmente si el token lo permite.
  // Por simplicidad aquí, asumimos que si hay un token, está autenticado.
  // Para una verificación más robusta, se debería llamar al backend para verificar el token.
  return !!token; // Convierte el string a booleano (true si existe y no es vacío)
}

// Función para obtener los datos del usuario del token o localStorage
// Si usas solo JWT, puedes decodificar el token para obtener el rol.
// Si guardas el usuario en localStorage, úsalo.
export function getCurrentUser() {
  // Opción 1: Decodificar el token JWT (requiere biblioteca como jwt-decode)
  // const token = localStorage.getItem('token');
  // if (token) {
  //   try {
  //     const decoded = jwt_decode(token); // Usar jwt-decode
  //     return { id_usuario: decoded.id, role: decoded.role, correo: decoded.correo, nombre_completo: decoded.nombre_completo };
  //   } catch (e) {
  //     console.error("Error decodificando token:", e);
  //     return null;
  //   }
  // }

  // Opción 2: Usar datos guardados en localStorage (como se hace en api.js)
  const userData = localStorage.getItem('user');
  if (userData) {
    try {
      return JSON.parse(userData);
    } catch (e) {
      console.error("Error parseando datos de usuario de localStorage:", e);
      return null;
    }
  }
  return null;
}

// Función para cerrar sesión
// Limpia el token y los datos del usuario
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');

  // Redirigir al login
  if (window.history && window.history.pushState) {
    window.history.pushState({}, '', '/login');
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
    // Opcional: Disparar evento personalizado
    // window.dispatchEvent(new CustomEvent('spa-navigate', { detail: { path: '/login' } }));
  } else {
    window.location.href = '/login';
  }
}

// Función para verificar permisos de administrador
export function requireAdmin() {
  const user = getCurrentUser();
  // Asegúrate de que el rol sea exactamente 'admin' como en la base de datos
  return user && user.role && user.role === 'admin';
}

// Función para proteger rutas privadas
export function protectRoute() {
  if (!isAuthenticated()) {
    // Redirigir al login si no está autenticado
    if (window.history && window.history.pushState) {
      window.history.pushState({}, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
      // Opcional: Disparar evento personalizado
      // window.dispatchEvent(new CustomEvent('spa-navigate', { detail: { path: '/login' } }));
    } else {
      window.location.href = '/login';
    }
    return false;
  }
  return true;
}

// Función para redirigir si ya está logueado (útil para login/register)
export function redirectIfLoggedIn() {
  const user = getCurrentUser();
  if (user) {
    // Redirigir según el rol del usuario
    if (user.role === 'admin') {
      window.history.pushState({}, '', '/adminviews');
      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
    } else { // Asumiendo que cualquier otro rol (como 'estudiante') va a customerviews
      window.history.pushState({}, '', '/customerviews');
      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
    }
  }
}

// Exponer funciones para que estén disponibles globalmente si es necesario
// Aunque es mejor usar import/export
window.routeProtection = {
  protectRoute,
  requireAdmin,
  logout // Asegúrate de que logout esté disponible si lo usa el router
};

// Opcional: Si otros archivos lo referencian como loginUtils
window.loginUtils = {
  isAuthenticated,
  getCurrentUser,
  logout
};