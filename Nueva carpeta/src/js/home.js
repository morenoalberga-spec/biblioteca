// src/js/home.js

export function home() {
    // Scroll al catálogo al hacer click en "Explorar Catálogo"
    window.scrollToCatalog = async function() {
        const catalog = document.getElementById('homeBooksContainer');
        catalog.scrollIntoView({ behavior: 'smooth' });

        try {
            const books = await API.getAvailableBooks();
            HomeRenderer.renderBooks(books);
        } catch (err) {
            console.error('Error cargando libros:', err);
            catalog.innerHTML = `<div class="text-center py-12 col-span-full">
      <p class="text-red-500">Error al cargar los libros.</p>
    </div>`;
        }
    };

    // API helper
    const API = {
        API_BASE_URL: 'http://localhost:3000', // Asegúrate de que coincida con el puerto de tu backend

        async getAvailableBooks() {
            // Llamamos a la ruta del nuevo backend
            const res = await fetch(`${this.API_BASE_URL}/libros`);
            if (!res.ok) {
                const errorText = await res.text(); // Obtener el mensaje de error si falla
                console.error(`Error ${res.status}: ${errorText}`);
                throw new Error(`Error al obtener libros: ${res.status} - ${errorText}`);
            }
            return await res.json();
        }
    };

    const HomeRenderer = {
        // Función para escapar HTML (previene XSS)
        escapeHtml(txt) {
            const map = {
                '&': '&amp;',
                '<': '<',
                '>': '>',
                '"': '&quot;',
                "'": '&#039;',
            };
            return txt.replace(/[&<>"']/g, (m) => map[m]);
        },

        createBookCard(book) {
            // Usamos los campos correctos de la nueva base de datos
            const titulo = this.escapeHtml(book.titulo || 'Título no disponible');
            const autor = this.escapeHtml(book.autor || 'Autor no disponible');
            const editorial = this.escapeHtml(book.editorial || 'Editorial no disponible');
            const anio = book.anio_publicacion || 'Año no disponible';
            const isbn = this.escapeHtml(book.isbn || 'ISBN no disponible');
            // Usamos portada_url en lugar de image
            const portadaUrl = book.portada_url || `https://picsum.photos/100/150?random=${Math.floor(Math.random() * 1000)}`;
            const idLibro = book.id_libro; // Asumiendo que el backend devuelve id_libro

            return `
      <div class="flex bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <!-- Imagen del libro -->
        <div class="w-24 h-32 flex-shrink-0">
          <img src="${portadaUrl}" alt="${titulo}" class="w-full h-full object-cover">
        </div>
        <!-- Información -->
        <div class="p-4 flex flex-col justify-between flex-grow">
          <div>
            <h3 class="text-lg font-semibold text-gray-800 line-clamp-2">${titulo}</h3>
            <p class="text-sm text-gray-600"><span class="font-medium">Autor:</span> ${autor}</p>
            <p class="text-sm text-gray-600"><span class="font-medium">Editorial:</span> ${editorial}</p>
            <p class="text-sm text-gray-600"><span class="font-medium">Año:</span> ${anio}</p>
            <p class="text-xs text-gray-500"><span class="font-medium">ISBN:</span> ${isbn}</p>
          </div>
          <button 
            onclick="window.location.href='/login'" 
            class="mt-2 self-start px-3 py-1 rounded-full bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition-colors">
            Conocer más
          </button>
        </div>
      </div>
    `;
        },

        renderBooks(books) {
            const container = document.getElementById('homeBooksContainer');
            if (!books || books.length === 0) {
                container.innerHTML = `<div class="text-center py-12 col-span-full">
        <p class="text-gray-500">No se encontraron libros disponibles.</p>
      </div>`;
                return;
            }
            container.innerHTML = books.map(book => this.createBookCard(book)).join('');
        }
    };

    // Carga de libros en el home
    const HomeManager = {
        async loadBooks() {
            try {
                const books = await API.getAvailableBooks();
                HomeRenderer.renderBooks(books);
            } catch (err) {
                console.error('Error cargando libros:', err);
                const container = document.getElementById('homeBooksContainer');
                container.innerHTML = `<div class="text-center py-12 col-span-full">
          <p class="text-red-500">Error al cargar los libros.</p>
        </div>`;
            }
        },

        init() {
            document.addEventListener('DOMContentLoaded', () => this.loadBooks());
        }
    };

    HomeManager.init();
}