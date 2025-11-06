// src/views/home.js
export function renderHome() {
  return `
  
  <!-- Navbar -->
<header class="bg-white shadow">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
    <!-- Logo y nombre -->
    <div class="flex items-center space-x-2">
      <img src="https://img.icons8.com/color/48/000000/book-shelf.png" alt="Logo Biblioteca" class="w-8 h-8" />
      <span class="text-lg font-semibold text-indigo-700">Biblioteca Virtual</span>
    </div>

    <!-- Navegación -->
    <nav class="space-x-6 text-sm text-gray-700">
      <!-- Asegúrate de que las rutas coincidan con las definidas en router.js -->
      <a href="/login" data-link class="hover:text-indigo-700 transition-colors">Iniciar Sesión</a>
      <a href="/register" data-link class="hover:text-indigo-700 transition-colors">Registrarse</a>
    </nav>
  </div>
</header>

<!-- Sección de bienvenida -->
<section class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-center py-20">
  <h1 class="text-3xl sm:text-4xl font-bold mb-4">Descubre el Mundo de la Lectura</h1>
  <p class="text-lg mb-8 max-w-2xl mx-auto">
    Accede a nuestra colección de libros, reserva lo que necesitas y gestiona tus préstamos desde cualquier lugar.
  </p>
  <button id="exploreBtn" class="bg-white text-indigo-700 font-semibold px-6 py-3 rounded-lg hover:bg-gray-100 transition-all duration-200 shadow-md">
    Explorar Catálogo
  </button>
</section>

<!-- Catálogo de libros -->
<section id="homeBooksContainer" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <h2 class="text-2xl font-bold text-gray-800 mb-6">Libros Destacados</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <!-- Los libros se cargarán aquí dinámicamente por home.js -->
        <div class="flex items-center justify-center py-12 col-span-full">
            <div class="text-center">
                <div role="status">
                    <svg class="inline mr-2 w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                        <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
                    </svg>
                    <span class="sr-only">Cargando libros...</span>
                </div>
                <p class="mt-2 text-gray-600">Cargando libros destacados...</p>
            </div>
        </div>
    </div>
</section> 

<script>
// Asociar la función de desplazamiento al botón "Explorar Catálogo"
document.addEventListener('DOMContentLoaded', function() {
    const exploreBtn = document.getElementById('exploreBtn');
    if (exploreBtn) {
        exploreBtn.addEventListener('click', function(e) {
            e.preventDefault(); // Prevenir comportamiento por defecto si es un enlace
            // Llamar a la función global definida en home.js
            if (typeof window.scrollToCatalog === 'function') {
                window.scrollToCatalog();
            } else {
                console.error('La función window.scrollToCatalog no está definida. Asegúrate de que home.js se haya cargado e inicializado correctamente.');
            }
        });
    }
});
</script>

  `;
}