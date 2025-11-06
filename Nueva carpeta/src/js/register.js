// src/js/register.js
import { redirectIfLoggedIn, getCurrentUser } from "../tools/tools"; // Asumiendo que getCurrentUser también está en tools.js

export function settingsregister() {
  // Verificar si el usuario está logueado
  const user = getCurrentUser();
  if (user) {
    // Si está logueado, redirigir según rol o al home
    if (user.role === 'admin') {
      // Si es admin, puede ver el formulario de registro de usuarios (opcional)
      console.log("Usuario admin, mostrando formulario de registro de usuarios (si aplica).");
      // Aquí podrías renderizar un formulario específico para admin que cree usuarios
      // renderAdminUserCreationForm(); // Esta función no está definida aquí, es un ejemplo
    } else {
      // Si es otro rol, no debería estar aquí
      alert("Acceso denegado. El registro de usuarios es administrado por el personal.");
      window.history.pushState({}, "", "/home"); // O donde corresponda
      window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
      return;
    }
  } else {
    // Usuario no logueado, informar que el registro no está disponible
    const appContainer = document.getElementById("app"); // Asumiendo que el router inyecta vistas aquí
    if (appContainer) {
      appContainer.innerHTML = `
        <div class="container mx-auto p-4 max-w-md">
          <h2 class="text-2xl font-bold text-center mb-6">Registro de Usuarios</h2>
          <div class="bg-white p-6 rounded-lg shadow-md">
            <p class="text-center text-gray-600 mb-4">
              El registro de nuevos usuarios es administrado por el personal.
            </p>
            <p class="text-center text-gray-600">
              Por favor, contacte al administrador de la biblioteca para crear una cuenta.
            </p>
            <div class="mt-6 text-center">
              <a href="/login" class="text-indigo-600 hover:text-indigo-800 font-medium">Ir a Iniciar Sesión</a>
            </div>
          </div>
        </div>
      `;
    }
    return; // Salir, no ejecutar la lógica de registro
  }

  // La lógica original para manejar el formulario solo se ejecuta si es admin
  // y has renderizado un formulario específico para admin (ver comentario arriba).
  // Si el usuario no es admin, la ejecución ya debería haberse detenido o redirigido.

  // Si se mantiene la funcionalidad de admin para crear usuarios aquí, la lógica sería similar,
  // pero apuntando a /usuarios (que ya requiere autenticación de admin).
  // async function handleRegistration(event) { ... }
  // const form = document.getElementById("registerForm");
  // if (form) { form.addEventListener("submit", handleRegistration); }

  redirectIfLoggedIn();
}