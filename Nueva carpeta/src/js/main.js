// src/js/main.js
// Importa el router desde la ubicación correcta
import { router } from "../router.js"; // Asumiendo que router.js está en src/

// Es para que las direcciones del navegador nos permitan avanzar y retroceder
window.addEventListener('popstate', router);

// Para que se renderice el contenido dinámico la primera vez
// Opcional: podrías querer verificar autenticación aquí antes de cargar la ruta inicial
window.addEventListener('load', router);

// Inicializa la ruta actual al cargar la página
router();

// Maneja la navegación interna mediante enlaces con data-link
document.addEventListener('click', e => {
    if (e.target.matches('[data-link]')) {
        e.preventDefault();
        // Actualiza la URL sin recargar la página
        history.pushState(null, null, e.target.href);
        // Ejecuta el router para cargar la nueva vista
        router();
    }
});