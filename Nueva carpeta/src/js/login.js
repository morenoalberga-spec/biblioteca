// src/js/login.js
import { redirectIfLoggedIn } from "../tools/tools";
import { login as apiLogin } from './api.js'; // Importar la función de login de api.js

export function settingLogin() {
  // login.js - Lógica de autenticación para SPA (Actualizado para nuevo backend)

  // Función para validar email
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Función para mostrar errores
  function showError(errorDiv, message) {
    if (errorDiv) {
      errorDiv.innerHTML = `
        <div class="rounded-md bg-red-50 p-4 mb-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">Error de autenticación</h3>
              <p class="mt-1 text-sm text-red-700">${message}</p>
            </div>
          </div>
        </div>
      `;
      errorDiv.style.display = 'block';
    }
  }

  // Función para ocultar errores
  function hideError(errorDiv) {
    if (errorDiv) {
      errorDiv.style.display = 'none';
      errorDiv.innerHTML = '';
    }
  }

  // Función para mostrar loading
  function showLoading() {
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Iniciando sesión...
      `;
    }
  }

  // Función para ocultar loading
  function hideLoading() {
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Iniciar Sesión';
    }
  }

  // Función para manejar login exitoso
  function handleSuccessfulLogin(userData) { // Recibe el userData del backend
    // El token ya fue guardado por apiLogin
    // El userData ya fue guardado por apiLogin
    // Redirigir según el role
    redirectUser(userData.role);
  }

  // Función para redirigir usuario según rol
  function redirectUser(role) {
    let redirectPath = '/'; // Ruta por defecto si algo falla

    switch (role?.toLowerCase()) {
      case 'admin':
        redirectPath = '/adminviews';
        break;
      case 'estudiante': // Asumiendo que el rol del usuario regular es 'estudiante'
        redirectPath = '/customerviews';
        break;
      default:
        console.warn('Rol no reconocido:', role);
        redirectPath = '/customerviews'; // Default para usuarios sin rol específico o inesperado
        break;
    }

    // Para SPA - usar history.pushState para navegación sin recarga
    if (window.history && window.history.pushState) {
      window.history.pushState({}, '', redirectPath);

      // Disparar evento personalizado para que el router SPA maneje la navegación
      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));

      // También disparar evento personalizado específico (opcional)
      // window.dispatchEvent(new CustomEvent('spa-navigate', { 
      //   detail: { path: redirectPath, user: userData } 
      // }));
    } else {
      // Fallback para navegadores antiguos
      window.location.href = redirectPath;
    }
  }

  // Función principal para manejar el login
  async function handleLogin(event) {
    event.preventDefault(); // Prevenir recarga de página

    // Obtener elementos del formulario
    const emailInput = document.getElementById('email'); // Asegúrate que el input de login tenga id="email"
    const passwordInput = document.getElementById('password'); // Asegúrate que el input de login tenga id="password"
    const errorDiv = document.getElementById('loginError');

    // Limpiar errores previos
    hideError(errorDiv);

    // Obtener valores
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    // Validaciones básicas
    if (!email || !password) {
      showError(errorDiv, 'Por favor, completa todos los campos');
      return;
    }

    if (!isValidEmail(email)) {
      showError(errorDiv, 'Por favor, ingresa un correo electrónico válido');
      return;
    }

    try {
      // Mostrar indicador de carga
      showLoading();

      // Llamar a la función de login de api.js (que maneja JWT y hashing)
      const userData = await apiLogin(email, password); // apiLogin ahora devuelve userData

      if (userData) {
        // Login exitoso
        handleSuccessfulLogin(userData);
      }
      // apiLogin ya maneja el error y muestra mensaje si las credenciales son incorrectas
    } catch (error) {
      console.error('Error durante el login:', error);
      // apiLogin ya debería haber mostrado un error específico
      // showError(errorDiv, 'Error de conexión o credenciales inválidas.');
    } finally {
      hideLoading();
    }
  }

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
    console.log("Listener de login agregado ");
  } else {
    console.error("No se encontró el formulario de login ");
  }

  // Opcional: Redirigir si ya está logueado
  redirectIfLoggedIn();
}