// src/js/user.js
import { getCurrentUser } from "../tools/tools.js";
import { fetchAPI } from './api.js'; // Importar la función genérica de api.js

export async function userviews() {
    const userNameEl = document.getElementById('userName');
    const currentUser = getCurrentUser();

    if (currentUser && currentUser.nombre_completo) {
        userNameEl.textContent = currentUser.nombre_completo;
    } else {
        userNameEl.textContent = 'Invitado';
    }

    // Logout
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            // Asumiendo que logout está definido en tools.js
            if (window.routeProtection && window.routeProtection.logout) {
                window.routeProtection.logout(); // O la función específica que uses
            } else {
                console.error("Función de logout no encontrada en window.routeProtection");
            }
        });
    }

    const user = getCurrentUser();
    if (!user) {
        // Opcional: Redirigir si no está autenticado
        // window.location.href = '/login';
        return;
    }

    // Configuración de la API
    const CONFIG = {
        API_BASE_URL: 'http://localhost:3000', // Ajusta si tu backend corre en otro puerto
        ENDPOINTS: {
            AVAILABLE_BOOKS: '/libros',
            USER_FAVORITES: `/usuarios/${user.id_usuario}/favoritos`, // Nueva ruta para favoritos
            USER_RESERVATIONS: `/reservas/usuario/${user.id_usuario}`, // Ruta para reservas del usuario (asumimos que la creas en index.js)
            CREATE_RESERVATION: '/reservas', // Ruta para crear reserva
        }
    };

    // Estado global de la app
    const AppState = {
        availableBooks: [],
        userFavorites: [],
        userReservations: [], // Agregamos estado para reservas
        isLoading: false
    };

    // Utilidades DOM
    const DOM = {
        show: (id) => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('hidden');
        },
        hide: (id) => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        },
        setContent: (id, content) => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = content;
        },
        showAlert: (type, message) => {
            const alertId = type === 'error' ? 'errorAlert' : 'successAlert';
            const messageId = type === 'error' ? 'errorMessage' : 'successMessage';
            DOM.setContent(messageId, message);
            DOM.show(alertId);
            setTimeout(() => DOM.hide(alertId), 5000);
        },
        updateCounts: () => {
            const availableCount = document.getElementById('availableBooksCount');
            const favoritesCount = document.getElementById('favoritesCount'); // Nuevo contador
            const reservationsCount = document.getElementById('reservationsCount'); // Nuevo contador
            if (availableCount) availableCount.textContent = AppState.availableBooks.length;
            if (favoritesCount) favoritesCount.textContent = AppState.userFavorites.length;
            if (reservationsCount) reservationsCount.textContent = AppState.userReservations.length;
        }
    };

    // Funciones API
    const API = {
        async request(endpoint, options = {}) {
            try {
                const response = await fetchAPI(endpoint, options); // Usar la función genérica de api.js
                // La función fetchAPI ya maneja errores 401 y tokens
                if (!response.ok) {
                    let errorData;
                    try {
                        errorData = await response.json();
                    } catch (e) {
                        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
                    }
                    throw new Error(errorData.error || `Error HTTP ${response.status}`);
                }
                // Manejar respuestas sin cuerpo (como DELETE 204)
                if (response.status === 204) {
                    return { success: true };
                }
                return await response.json();
            } catch (err) {
                console.error('API Error:', err);
                throw err;
            }
        },

        async getAvailableBooks() {
            return await this.request(CONFIG.ENDPOINTS.AVAILABLE_BOOKS);
        },

        async getUserFavorites() {
            return await this.request(CONFIG.ENDPOINTS.USER_FAVORITES);
        },

        async getUserReservations() { // Nueva función
            // Asumiendo que creas esta ruta en index.js: GET /reservas/usuario/:id_usuario
            return await this.request(`/reservas/usuario/${user.id_usuario}`);
        },

        async addBookToFavorites(id_libro) {
            // Usar la ruta para agregar a favoritos
            return await this.request(`/usuarios/${user.id_usuario}/favoritos`, {
                method: 'POST',
                body: JSON.stringify({ id_libro }) // Enviar id_libro en el body
            });
        },

        async removeBookFromFavorites(id_libro) {
            // Usar la ruta para eliminar de favoritos
            return await this.request(`/usuarios/${user.id_usuario}/favoritos/${id_libro}`, {
                method: 'DELETE'
            });
        },

        async createReservation(id_libro) { // Nueva función
            return await this.request(CONFIG.ENDPOINTS.CREATE_RESERVATION, {
                method: 'POST',
                body: JSON.stringify({ id_libro }) // Enviar id_libro en el body
            });
        },

        async cancelReservation(id_reserva) { // Nueva función
            // Asumiendo que tienes una ruta PUT /reservas/:id/cancelar en index.js
            return await this.request(`/reservas/${id_reserva}/cancelar`, {
                method: 'PUT'
            });
        }
    };

    // Renderizado
    const Renderer = {
        createBookCard(book, isFavorite = false, isReservation = false) { // Nuevo parámetro isReservation
            const isAlreadyFavorite = AppState.userFavorites.some(fav => fav.id_libro === book.id_libro);
            const isReserved = AppState.userReservations.some(res => res.id_libro === book.id_libro && res.estado !== 'cumplida' && res.estado !== 'cancelada' && res.estado !== 'expirada'); // Considerar solo reservas activas

            return `
      <div class="book-card bg-gray-50 border border-gray-200 rounded-xl p-6 mb-6 hover:shadow-md hover:border-gray-300 transition-all duration-200 fade-in">
        <div class="flex flex-col h-full">
          <div class="flex-grow space-y-4">
            <h3 class="text-xl font-bold text-gray-800 line-clamp-2 leading-tight">${book.titulo || 'Sin título'}</h3>
            <div class="space-y-2">
              <p class="text-gray-600 flex items-start">
                <span class="font-semibold text-gray-700 w-20 flex-shrink-0">Autor:</span> 
                <span class="flex-1">${book.autor || 'No especificado'}</span>
              </p>
              <p class="text-gray-600 flex items-start">
                <span class="font-semibold text-gray-700 w-20 flex-shrink-0">Año:</span> 
                <span class="flex-1">${book.anio_publicacion || 'No especificado'}</span>
              </p>
              <p class="text-gray-600 flex items-start">
                <span class="font-semibold text-gray-700 w-20 flex-shrink-0">Editorial:</span> 
                <span class="flex-1">${book.editorial || 'No especificado'}</span>
              </p>
              <div class="bg-gray-100 px-3 py-2 rounded-lg">
                <p class="text-sm text-gray-700">
                  <span class="font-semibold">ISBN:</span> 
                  <code class="bg-white px-2 py-1 rounded text-xs font-mono">${book.isbn}</code>
                </p>
              </div>
            </div>
          </div>
          <div class="mt-6 pt-4 border-t border-gray-200 space-y-3">
            ${
              isReservation
                ? `
                    <p class="text-sm text-gray-600"><strong>Estado Reserva:</strong> ${book.estado || 'N/A'}</p>
                    <p class="text-sm text-gray-600"><strong>Fecha Reserva:</strong> ${book.fecha_reserva ? new Date(book.fecha_reserva).toLocaleDateString() : 'N/A'}</p>
                    <p class="text-sm text-gray-600"><strong>Expira:</strong> ${book.fecha_expiracion ? new Date(book.fecha_expiracion).toLocaleDateString() : 'N/A'}</p>
                    ${
                      book.estado === 'pendiente' || book.estado === 'aprobada' ? `
                        <button onclick="UserBookManager.cancelReservation('${book.id_reserva}', '${book.titulo}')" class="w-full bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium flex items-center justify-center space-x-2">
                          <span>Cancelar Reserva</span>
                        </button>
                      ` : ''
                    }
                    ${
                      book.estado === 'cumplida' ? `
                        <p class="text-green-600 font-medium">¡Libro Prestado!</p>
                      ` : ''
                    }
                    ${
                      book.estado === 'rechazada' || book.estado === 'cancelada' || book.estado === 'expirada' ? `
                        <p class="text-gray-500 font-medium">Reserva ${book.estado}</p>
                      ` : ''
                    }
                `
                : `
                    <button 
                      onclick="UserBookManager.toggleFavorite(${book.id_libro}, ${isAlreadyFavorite}, '${book.titulo}')" 
                      class="w-full px-4 py-3 rounded-lg transition-colors duration-200 font-medium flex items-center justify-center space-x-2 ${
                        isAlreadyFavorite 
                          ? 'bg-yellow-400 text-white hover:bg-yellow-500' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }">
                      <span>${isAlreadyFavorite ? 'Quitar de Favoritos' : 'Agregar a Favoritos'}</span>
                    </button>
                    ${
                      !isReserved ? `
                        <button 
                          onclick="UserBookManager.createReservation(${book.id_libro}, '${book.titulo}')" 
                          class="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium flex items-center justify-center space-x-2">
                          <span>Reservar Libro</span>
                        </button>
                      ` : `
                        <button class="w-full bg-gray-300 text-gray-500 px-4 py-3 rounded-lg cursor-not-allowed font-medium flex items-center justify-center space-x-2" disabled>
                          <span>Ya Reservado</span>
                        </button>
                      `
                    }
                `
            }
          </div>
        </div>
      </div>
    `;
        },

        renderAvailableBooks(books) {
            const container = document.getElementById('availableBooksContainer');
            if (!books || books.length === 0) {
                container.innerHTML = `
        <div class="text-center py-16">
          <p class="text-gray-500 text-xl font-medium">No se encontraron libros disponibles</p>
          <p class="text-gray-400 text-sm mt-2">Los libros aparecerán aquí cuando estén disponibles</p>
        </div>
      `;
                return;
            }
            container.innerHTML = books
                .map(book => this.createBookCard(book, false, false)) // No es favorito ni reserva
                .join('');
            DOM.updateCounts();
        },

        renderUserFavorites(books) {
            const container = document.getElementById('myFavoritesContainer'); // Nuevo contenedor
            if (!books || books.length === 0) {
                container.innerHTML = `
        <div class="text-center py-16">
          <p class="text-gray-500 text-xl font-medium">Tu lista de favoritos está vacía</p>
          <p class="text-gray-400 text-sm mt-2">Agrega libros desde la sección de libros disponibles</p>
        </div>
      `;
                return;
            }
            container.innerHTML = books
                .map(book => this.createBookCard(book, true, false)) // Es favorito, no reserva
                .join('');
            DOM.updateCounts();
        },

        renderUserReservations(reservations) { // Nuevo renderizador
            const container = document.getElementById('myReservationsContainer'); // Nuevo contenedor
            if (!reservations || reservations.length === 0) {
                container.innerHTML = `
        <div class="text-center py-16">
          <p class="text-gray-500 text-xl font-medium">No tienes reservas activas</p>
          <p class="text-gray-400 text-sm mt-2">Haz una reserva desde la sección de libros disponibles</p>
        </div>
      `;
                return;
            }
            // Asumiendo que 'reservations' contiene los datos del libro anidados o que se puede mapear
            // Si la vista v_reservas_completas no devuelve el título del libro directamente en cada fila,
            // necesitarás hacer otra llamada para obtener los detalles del libro.
            // Por simplicidad aquí, asumimos que 'reservations' tiene {id_reserva, id_libro, titulo, estado, fecha_reserva, fecha_expiracion, ...}
            container.innerHTML = reservations
                .map(res => {
                    // Crear un objeto "falso" que contenga datos de la reserva y el libro para poder usar createBookCard
                    const bookData = {
                        id_libro: res.id_libro,
                        titulo: res.titulo, // Debe venir de la vista
                        autor: res.autor, // Debe venir de la vista
                        isbn: res.isbn, // Debe venir de la vista
                        anio_publicacion: res.anio_publicacion, // Debe venir de la vista
                        editorial: res.editorial, // Debe venir de la vista
                        // Datos de la reserva
                        id_reserva: res.id_reserva,
                        estado: res.estado,
                        fecha_reserva: res.fecha_reserva,
                        fecha_expiracion: res.fecha_expiracion,
                        // ... otros campos de reserva si son necesarios
                    };
                    return this.createBookCard(bookData, false, true); // No es favorito, es reserva
                })
                .join('');
            DOM.updateCounts();
        }
    };

    const UserBookManager = {
        async loadAvailableBooks() {
            try {
                AppState.isLoading = true;
                const books = await API.getAvailableBooks();
                AppState.availableBooks = Array.isArray(books) ? books : [];
                Renderer.renderAvailableBooks(AppState.availableBooks);
            } catch (err) {
                console.error('Error cargando libros disponibles:', err);
                DOM.showAlert('error', 'Error al cargar los libros disponibles.');
                const container = document.getElementById('availableBooksContainer');
                if (container) {
                    container.innerHTML = `
          <div class="text-center py-16">
            <p class="text-red-500 text-xl font-medium">Error al cargar libros</p>
            <p class="text-gray-500 text-sm mt-2">Verifica tu conexión e intenta nuevamente</p>
            <button onclick="UserBookManager.loadAvailableBooks()" class="mt-4 bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-colors">
               Reintentar
            </button>
          </div>
        `;
                }
            } finally {
                AppState.isLoading = false;
            }
        },

        async loadUserFavorites() {
            try {
                AppState.isLoading = true;
                const books = await API.getUserFavorites();
                AppState.userFavorites = Array.isArray(books) ? books : [];
                Renderer.renderUserFavorites(AppState.userFavorites);
            } catch (err) {
                console.error('Error cargando favoritos del usuario:', err);
                DOM.showAlert('error', 'Error al cargar tus favoritos.');
                const container = document.getElementById('myFavoritesContainer');
                if (container) {
                    container.innerHTML = `
          <div class="text-center py-16">
            <p class="text-red-500 text-xl font-medium">Error al cargar favoritos</p>
            <p class="text-gray-500 text-sm mt-2">Verifica tu conexión e intenta nuevamente</p>
            <button onclick="UserBookManager.loadUserFavorites()" class="mt-4 bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-colors">
               Reintentar
            </button>
          </div>
        `;
                }
            } finally {
                AppState.isLoading = false;
            }
        },

        async loadUserReservations() { // Nueva función
            try {
                AppState.isLoading = true;
                const reservations = await API.getUserReservations();
                // Filtrar para mostrar solo reservas no canceladas/expiradas/cumplidas si es necesario
                // AppState.userReservations = Array.isArray(reservations) ? reservations.filter(r => r.estado !== 'cancelada' && r.estado !== 'expirada' && r.estado !== 'cumplida') : [];
                AppState.userReservations = Array.isArray(reservations) ? reservations : [];
                Renderer.renderUserReservations(AppState.userReservations);
            } catch (err) {
                console.error('Error cargando reservas del usuario:', err);
                DOM.showAlert('error', 'Error al cargar tus reservas.');
                const container = document.getElementById('myReservationsContainer');
                if (container) {
                    container.innerHTML = `
          <div class="text-center py-16">
            <p class="text-red-500 text-xl font-medium">Error al cargar reservas</p>
            <p class="text-gray-500 text-sm mt-2">Verifica tu conexión e intenta nuevamente</p>
            <button onclick="UserBookManager.loadUserReservations()" class="mt-4 bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-colors">
               Reintentar
            </button>
          </div>
        `;
                }
            } finally {
                AppState.isLoading = false;
            }
        },

        async toggleFavorite(id_libro, isCurrentlyFavorite, bookTitle) {
            if (AppState.isLoading) return;

            try {
                AppState.isLoading = true;
                if (isCurrentlyFavorite) {
                    await API.removeBookFromFavorites(id_libro);
                    DOM.showAlert('success', `"${bookTitle}" ha sido removido de tus favoritos.`);
                } else {
                    await API.addBookToFavorites(id_libro);
                    DOM.showAlert('success', `"${bookTitle}" ha sido agregado a tus favoritos.`);
                }
                await this.loadUserFavorites(); // Recargar favoritos
                await this.loadAvailableBooks(); // Recargar disponibles para actualizar botón de favorito
            } catch (err) {
                console.error('Error modificando favorito:', err);
                let errorMessage = 'Error al modificar favorito';
                if (err.message.includes('404')) {
                    errorMessage = 'Libro no encontrado';
                } else if (err.message) {
                    errorMessage = err.message;
                }
                DOM.showAlert('error', errorMessage);
            } finally {
                AppState.isLoading = false;
            }
        },

        async createReservation(id_libro, bookTitle) {
            if (AppState.isLoading) return;

            if (!id_libro) {
                DOM.showAlert('error', 'ID de libro inválido');
                return;
            }

            try {
                AppState.isLoading = true;
                await API.createReservation(id_libro);
                DOM.showAlert('success', `Reserva para "${bookTitle}" creada exitosamente.`);
                await this.loadUserReservations(); // Recargar reservas
                await this.loadAvailableBooks(); // Recargar disponibles para actualizar botón de reserva
            } catch (err) {
                console.error('Error creando reserva:', err);
                let errorMessage = 'Error al crear reserva';
                if (err.message.includes('400')) {
                    errorMessage = err.message; // El procedimiento almacenado puede lanzar un error específico
                } else if (err.message.includes('404')) {
                    errorMessage = 'Libro no encontrado';
                } else if (err.message) {
                    errorMessage = err.message;
                }
                DOM.showAlert('error', errorMessage);
            } finally {
                AppState.isLoading = false;
            }
        },

        async cancelReservation(id_reserva, bookTitle) {
            if (AppState.isLoading) return;

            if (!id_reserva) {
                DOM.showAlert('error', 'ID de reserva inválido');
                return;
            }

            if (!confirm(`¿Estás seguro de que deseas cancelar la reserva para "${bookTitle}"?`)) {
                return;
            }

            try {
                AppState.isLoading = true;
                await API.cancelReservation(id_reserva); // Asumiendo que tienes esta ruta en index.js
                DOM.showAlert('success', `Reserva para "${bookTitle}" cancelada.`);
                await this.loadUserReservations(); // Recargar reservas
                await this.loadAvailableBooks(); // Recargar disponibles
            } catch (err) {
                console.error('Error cancelando reserva:', err);
                let errorMessage = 'Error al cancelar reserva';
                if (err.message.includes('404')) {
                    errorMessage = 'Reserva no encontrada';
                } else if (err.message) {
                    errorMessage = err.message;
                }
                DOM.showAlert('error', errorMessage);
            } finally {
                AppState.isLoading = false;
            }
        },

        async init() {
            try {
                await Promise.all([
                    this.loadAvailableBooks(),
                    this.loadUserFavorites(),
                    this.loadUserReservations() // Cargar también las reservas
                ]);

                // Event listeners (opcional)
                const logoutBtn = document.getElementById('logoutBtn');
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', () => {
                        // Asumiendo que logout está definido en tools.js
                        if (window.routeProtection && window.routeProtection.logout) {
                            window.routeProtection.logout();
                        } else {
                            alert('Función de logout no implementada');
                        }
                    });
                }

                // Puedes agregar botones de refresco si lo deseas
                const refreshBooksBtn = document.getElementById('refreshBooksBtn');
                if (refreshBooksBtn) {
                    refreshBooksBtn.addEventListener('click', () => this.loadAvailableBooks());
                }
                const refreshFavoritesBtn = document.getElementById('refreshFavoritesBtn');
                if (refreshFavoritesBtn) {
                    refreshFavoritesBtn.addEventListener('click', () => this.loadUserFavorites());
                }
                const refreshReservationsBtn = document.getElementById('refreshReservationsBtn');
                if (refreshReservationsBtn) {
                    refreshReservationsBtn.addEventListener('click', () => this.loadUserReservations());
                }

            } catch (error) {
                console.error('Error inicializando UserBookManager:', error);
                DOM.showAlert('error', 'Error al inicializar la aplicación');
            }
        }
    };

    // Inicialización
    document.addEventListener('DOMContentLoaded', () => {
        UserBookManager.init();
    });

    // Exponer para los onclick de los botones
    window.UserBookManager = UserBookManager;
}