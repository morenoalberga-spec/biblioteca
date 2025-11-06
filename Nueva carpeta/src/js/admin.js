// src/js/admin.js
import { getCurrentUser, logout } from "../tools/tools.js"; // Asumiendo que logout está en tools.js
import { fetchAPI } from './api.js'; // Importar la función genérica de api.js

export function settingsAdmin() {
  // Verificar autenticación y rol
  const user = getCurrentUser();
  if (!user || user.role !== 'admin') {
    alert("Acceso denegado. Requiere rol de administrador.");
    window.history.pushState({}, "", "/login");
    window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
    return;
  }

  // --- Configuración API ---
  const API_BASE_URL = "http://localhost:3000"; // Ajusta si tu backend corre en otro puerto
  const API_LIBROS_URL = `${API_BASE_URL}/libros`;
  const API_RESERVAS_URL = `${API_BASE_URL}/reservas`;
  const API_PRESTAMOS_URL = `${API_BASE_URL}/prestamos`;
  const API_USUARIOS_URL = `${API_BASE_URL}/usuarios`;

  // Variables globales
  let libros = [];
  let reservas = [];
  let prestamos = [];
  let usuarios = [];
  let editingBookId = null;
  let bookToDelete = null;
  let elements = {};

  // --- Helper: manejar respuestas fetch ---
  // (Reutilizamos la lógica de api.js o aquí si prefieres no depender de api.js para este archivo específico)
  // async function handleFetchResponse(response) { ... } // Ya está en api.js

  // --- Inicializar referencias a elementos DOM ---
  // Asumiendo que la vista adminviews.js renderiza elementos con estos IDs
  async function initializeElements() {
    return new Promise((resolve) => {
      const checkElements = () => {
        elements = {
          // Botones generales
          logoutBtn: document.getElementById("logoutBtn"),
          // Tabs para diferentes vistas de admin
          tabLibrosBtn: document.getElementById("tabLibrosBtn"),
          tabReservasBtn: document.getElementById("tabReservasBtn"),
          tabPrestamosBtn: document.getElementById("tabPrestamosBtn"),
          tabUsuariosBtn: document.getElementById("tabUsuariosBtn"),
          // Contenedores de vistas
          librosView: document.getElementById("librosView"),
          reservasView: document.getElementById("reservasView"),
          prestamosView: document.getElementById("prestamosView"),
          usuariosView: document.getElementById("usuariosView"),
          // Formulario de libros (asumiendo que está en la vista de libros)
          showFormBtn: document.getElementById("showFormBtn"),
          formContainer: document.getElementById("formContainer"),
          bookForm: document.getElementById("bookForm"),
          formTitle: document.getElementById("formTitle"),
          cancelBtn: document.getElementById("cancelBtn"),
          saveBtn: document.getElementById("saveBtn"),
          bookId: document.getElementById("bookId"),
          title: document.getElementById("title"),
          author: document.getElementById("author"),
          editorial: document.getElementById("editorial"),
          year: document.getElementById("year"),
          genre: document.getElementById("genre"),
          code: document.getElementById("code"),
          link: document.getElementById("link"),
          // Tabla de libros
          booksTable: document.getElementById("booksTable"),
          loadingSpinner: document.getElementById("loadingSpinner"),
          notification: document.getElementById("notification"),
          noBooks: document.getElementById("noBooks"),
          // Modal de confirmación (asumiendo que está en la vista de libros)
          confirmModal: document.getElementById("confirmModal"),
          confirmDelete: document.getElementById("confirmDelete"),
          cancelDelete: document.getElementById("cancelDelete"),
          // Tabla de reservas (asumiendo que está en la vista de reservas)
          reservationsTable: document.getElementById("reservationsTable"),
          noReservations: document.getElementById("noReservations"),
          // Tabla de préstamos (asumiendo que está en la vista de préstamos)
          loansTable: document.getElementById("loansTable"),
          noLoans: document.getElementById("noLoans"),
          // Tabla de usuarios (asumiendo que está en la vista de usuarios)
          usersTable: document.getElementById("usersTable"),
          noUsers: document.getElementById("noUsers"),
        };
        const allFound = Object.values(elements).every((e) => e !== null);
        if (allFound) resolve();
        else setTimeout(checkElements, 50);
      };
      checkElements();
    });
  }

  // --- Eventos ---
  async function setupEventListeners() {
    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener("click", () => logout()); // Usar la función logout de tools.js
    }
    // Eventos para cambiar de pestaña (tabs)
    if (elements.tabLibrosBtn) elements.tabLibrosBtn.addEventListener("click", () => showView('libros'));
    if (elements.tabReservasBtn) elements.tabReservasBtn.addEventListener("click", () => showView('reservas'));
    if (elements.tabPrestamosBtn) elements.tabPrestamosBtn.addEventListener("click", () => showView('prestamos'));
    if (elements.tabUsuariosBtn) elements.tabUsuariosBtn.addEventListener("click", () => showView('usuarios'));

    // Eventos para la vista de libros
    if (elements.showFormBtn) elements.showFormBtn.addEventListener("click", showCreateForm);
    if (elements.cancelBtn) elements.cancelBtn.addEventListener("click", hideForm);
    if (elements.bookForm) elements.bookForm.addEventListener("submit", handleSubmit);
    if (elements.confirmDelete) elements.confirmDelete.addEventListener("click", confirmDelete);
    if (elements.cancelDelete) elements.cancelDelete.addEventListener("click", hideConfirmModal);
  }

  // --- Navegación entre vistas (tabs) ---
  function showView(viewName) {
    // Ocultar todas las vistas
    if (elements.librosView) elements.librosView.classList.add('hidden');
    if (elements.reservasView) elements.reservasView.classList.add('hidden');
    if (elements.prestamosView) elements.prestamosView.classList.add('hidden');
    if (elements.usuariosView) elements.usuariosView.classList.add('hidden');

    // Mostrar la vista seleccionada
    if (elements[`${viewName}View`]) elements[`${viewName}View`].classList.remove('hidden');

    // Cargar datos de la vista seleccionada
    switch(viewName) {
        case 'libros':
            loadBooks();
            break;
        case 'reservas':
            loadReservations();
            break;
        case 'prestamos':
            loadLoans();
            break;
        case 'usuarios':
            loadUsers();
            break;
    }
  }

  // --- Cargar libros desde API y renderizar ---
  async function loadBooks() {
    if (!elements.booksTable) return; // Si no existe la tabla, no cargar
    showLoading(true);
    try {
      const response = await fetchAPI('/libros'); // Usar la nueva ruta del backend
      if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
      const data = await response.json();
      libros = Array.isArray(data) ? data : Object.values(data || {});
      renderBooks();
    } catch (err) {
      console.error("Error cargando libros:", err);
      libros = [];
      renderBooks();
      showNotification(`Error al cargar libros: ${err.message}`, "error");
    } finally {
      showLoading(false);
    }
  }

  function renderBooks() {
    if (!elements.booksTable) return; // Si no existe la tabla, no renderizar
    const tbody = elements.booksTable;
    tbody.innerHTML = "";
    if (libros.length === 0) {
      if (elements.noBooks) elements.noBooks.classList.remove("hidden");
      return;
    }
    if (elements.noBooks) elements.noBooks.classList.add("hidden");
    tbody.innerHTML = libros
      .map(
        (book) => `
        <tr class="hover:bg-gray-50">
            <td class="px-4 py-3">${book.isbn || ""}</td>
            <td class="px-4 py-3">${escapeHtml(book.titulo || "")}</td>
            <td class="px-4 py-3">${escapeHtml(book.autor || "")}</td>
            <td class="px-4 py-3">${escapeHtml(book.editorial || "")}</td>
            <td class="px-4 py-3">${book.anio_publicacion || ""}</td>
            <td class="px-4 py-3">${escapeHtml(book.genero || "")}</td>
            <td class="px-4 py-3">
                ${
                  book.link
                    ? `<a href="${book.link}" target="_blank" class="text-blue-500 underline">Ver enlace</a>`
                    : ""
                }
            </td>
            <td class="px-4 py-3 flex gap-2">
                <button onclick="editBook('${book.isbn}')" class="bg-yellow-500 text-white px-2 py-1 rounded">Editar</button>
                <button onclick="deleteBook('${book.isbn}')" class="bg-red-500 text-white px-2 py-1 rounded">Eliminar</button>
            </td>
        </tr>
    `
      )
      .join("");
  }

  // --- Cargar reservas desde API y renderizar ---
  async function loadReservations() {
    if (!elements.reservationsTable) return; // Si no existe la tabla, no cargar
    showLoading(true);
    try {
      const response = await fetchAPI('/reservas'); // Usar la nueva ruta del backend
      if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
      const data = await response.json(); // Asumiendo que la vista v_reservas_completas devuelve un array
      reservas = Array.isArray(data) ? data : Object.values(data || {});
      renderReservations();
    } catch (err) {
      console.error("Error cargando reservas:", err);
      reservas = [];
      renderReservations();
      showNotification(`Error al cargar reservas: ${err.message}`, "error");
    } finally {
      showLoading(false);
    }
  }

  function renderReservations() {
    if (!elements.reservationsTable) return; // Si no existe la tabla, no renderizar
    const tbody = elements.reservationsTable;
    tbody.innerHTML = "";
    if (reservas.length === 0) {
      if (elements.noReservations) elements.noReservations.classList.remove("hidden");
      return;
    }
    if (elements.noReservations) elements.noReservations.classList.add("hidden");
    tbody.innerHTML = reservas
      .map(
        (res) => `
        <tr class="hover:bg-gray-50">
            <td class="px-4 py-3">${res.id_reserva}</td>
            <td class="px-4 py-3">${escapeHtml(res.nombre_usuario || "")}</td>
            <td class="px-4 py-3">${escapeHtml(res.titulo || "")}</td>
            <td class="px-4 py-3">${escapeHtml(res.estado || "")}</td>
            <td class="px-4 py-3">${res.fecha_reserva ? new Date(res.fecha_reserva).toLocaleDateString() : ""}</td>
            <td class="px-4 py-3">${res.fecha_expiracion ? new Date(res.fecha_expiracion).toLocaleDateString() : ""}</td>
            <td class="px-4 py-3">${res.dias_restantes}</td>
            <td class="px-4 py-3">${res.admin_aprobador_nombre || "N/A"}</td>
            <td class="px-4 py-3">
                ${res.estado === 'pendiente' ? `
                    <button onclick="aprobarReserva('${res.id_reserva}')" class="bg-green-500 text-white px-2 py-1 rounded mr-1">Aprobar</button>
                    <button onclick="rechazarReserva('${res.id_reserva}')" class="bg-red-500 text-white px-2 py-1 rounded">Rechazar</button>
                ` : ''}
            </td>
        </tr>
    `
      )
      .join("");
  }

  // --- Cargar préstamos desde API y renderizar ---
  async function loadLoans() {
    if (!elements.loansTable) return; // Si no existe la tabla, no cargar
    showLoading(true);
    try {
      const response = await fetchAPI('/prestamos'); // Usar la nueva ruta del backend
      if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
      const data = await response.json();
      prestamos = Array.isArray(data) ? data : Object.values(data || {});
      renderLoans();
    } catch (err) {
      console.error("Error cargando préstamos:", err);
      prestamos = [];
      renderLoans();
      showNotification(`Error al cargar préstamos: ${err.message}`, "error");
    } finally {
      showLoading(false);
    }
  }

  function renderLoans() {
    if (!elements.loansTable) return; // Si no existe la tabla, no renderizar
    const tbody = elements.loansTable;
    tbody.innerHTML = "";
    if (prestamos.length === 0) {
      if (elements.noLoans) elements.noLoans.classList.remove("hidden");
      return;
    }
    if (elements.noLoans) elements.noLoans.classList.add("hidden");
    tbody.innerHTML = prestamos
      .map(
        (loan) => `
        <tr class="hover:bg-gray-50">
            <td class="px-4 py-3">${loan.id_prestamo}</td>
            <td class="px-4 py-3">${escapeHtml(loan.nombre_usuario || "")}</td>
            <td class="px-4 py-3">${escapeHtml(loan.codigo_ejemplar || "")}</td>
            <td class="px-4 py-3">${escapeHtml(loan.titulo_libro || "")}</td>
            <td class="px-4 py-3">${escapeHtml(loan.estado_nombre || "")}</td>
            <td class="px-4 py-3">${loan.fecha_prestamo ? new Date(loan.fecha_prestamo).toLocaleDateString() : ""}</td>
            <td class="px-4 py-3">${loan.fecha_devolucion_esperada ? new Date(loan.fecha_devolucion_esperada).toLocaleDateString() : ""}</td>
            <td class="px-4 py-3">${loan.fecha_devolucion_real ? new Date(loan.fecha_devolucion_real).toLocaleDateString() : "N/A"}</td>
            <td class="px-4 py-3">${loan.renovaciones}</td>
            <td class="px-4 py-3">
                ${loan.estado_nombre === 'Prestado' && !loan.fecha_devolucion_real ? `
                    <button onclick="devolverPrestamo('${loan.id_prestamo}')" class="bg-blue-500 text-white px-2 py-1 rounded">Devolver</button>
                ` : 'N/A'}
            </td>
        </tr>
    `
      )
      .join("");
  }

  // --- Cargar usuarios desde API y renderizar ---
  async function loadUsers() {
    if (!elements.usersTable) return; // Si no existe la tabla, no cargar
    showLoading(true);
    try {
      const response = await fetchAPI('/usuarios'); // Usar la nueva ruta del backend
      if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
      const data = await response.json();
      usuarios = Array.isArray(data) ? data : Object.values(data || {});
      renderUsers();
    } catch (err) {
      console.error("Error cargando usuarios:", err);
      usuarios = [];
      renderUsers();
      showNotification(`Error al cargar usuarios: ${err.message}`, "error");
    } finally {
      showLoading(false);
    }
  }

  function renderUsers() {
    if (!elements.usersTable) return; // Si no existe la tabla, no renderizar
    const tbody = elements.usersTable;
    tbody.innerHTML = "";
    if (usuarios.length === 0) {
      if (elements.noUsers) elements.noUsers.classList.remove("hidden");
      return;
    }
    if (elements.noUsers) elements.noUsers.classList.add("hidden");
    tbody.innerHTML = usuarios
      .map(
        (usr) => `
        <tr class="hover:bg-gray-50">
            <td class="px-4 py-3">${usr.id_usuario}</td>
            <td class="px-4 py-3">${escapeHtml(usr.nombre_completo || "")}</td>
            <td class="px-4 py-3">${escapeHtml(usr.correo || "")}</td>
            <td class="px-4 py-3">${escapeHtml(usr.telefono || "")}</td>
            <td class="px-4 py-3">${escapeHtml(usr.role || "")}</td>
            <td class="px-4 py-3">${escapeHtml(usr.estado_cuenta || "")}</td>
            <td class="px-4 py-3">${usr.fecha_registro ? new Date(usr.fecha_registro).toLocaleDateString() : ""}</td>
            <td class="px-4 py-3">
                <button onclick="editarUsuario('${usr.id_usuario}')" class="bg-yellow-500 text-white px-2 py-1 rounded mr-1">Editar</button>
                <button onclick="eliminarUsuario('${usr.id_usuario}')" class="bg-red-500 text-white px-2 py-1 rounded">Eliminar</button>
            </td>
        </tr>
    `
      )
      .join("");
  }

  // --- Crear/editar libro ---
  async function handleSubmit(e) {
    e.preventDefault();
    if (!elements.bookForm) return; // Si no existe el formulario, no procesar

    const bookData = {
      isbn: elements.code.value.trim(),
      titulo: elements.title.value.trim(),
      autor: elements.author.value.trim() || null,
      editorial: elements.editorial.value.trim() || null,
      anio_publicacion: parseInt(elements.year.value) || null,
      genero: elements.genre?.value.trim() || null, // Cambiado de 'genre' a 'genero'
      link: elements.link.value.trim() || null,
      // No se envía 'estado' aquí, lo maneja la base de datos
    };

    try {
      let response;
      if (editingBookId) {
        response = await fetchAPI(`/libros/${editingBookId}`, {
          method: "PUT",
          body: JSON.stringify(bookData),
        });
      } else {
        response = await fetchAPI('/libros', {
          method: "POST",
          body: JSON.stringify(bookData),
        });
      }

      if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
      // const result = await response.json(); // Puede no ser necesario

      hideForm();
      loadBooks(); // Recargar lista de libros
      showNotification(
        editingBookId ? "Libro actualizado" : "Libro creado",
        "success"
      );
    } catch (err) {
      console.error("Error guardando libro", err);
      showNotification(`Error guardando libro: ${err.message}`, "error");
    }
  }

  function showEditForm(book) {
    if (!elements.formContainer || !elements.bookForm) return; // Si no existen, no mostrar
    editingBookId = book.isbn;
    elements.formTitle.textContent = "Editar Libro";
    elements.formContainer.classList.remove("hidden");
    elements.bookId.value = book.isbn;
    elements.title.value = book.titulo;
    elements.author.value = book.autor;
    elements.editorial.value = book.editorial;
    elements.year.value = book.anio_publicacion;
    elements.genre.value = book.genero; // Asumiendo que tienes un campo genre
    elements.code.value = book.isbn;
    elements.link.value = book.link;
  }

  function showCreateForm() {
    if (!elements.formContainer || !elements.bookForm) return; // Si no existen, no mostrar
    editingBookId = null;
    elements.formTitle.textContent = "Agregar Nuevo Libro";
    elements.formContainer.classList.remove("hidden");
    elements.bookForm.reset();
  }

  function hideForm() {
    if (!elements.formContainer) return; // Si no existe, no ocultar
    elements.formContainer.classList.add("hidden");
    editingBookId = null;
  }

  function editBook(isbn) {
    const book = libros.find((x) => x.isbn == isbn);
    if (book) showEditForm(book);
  }

  function deleteBook(isbn) {
    if (!elements.confirmModal) return; // Si no existe el modal, no mostrar
    bookToDelete = isbn;
    elements.confirmModal.classList.remove("hidden");
  }

  async function confirmDelete() {
    if (!bookToDelete || !elements.confirmModal) return;
    try {
      const response = await fetchAPI(`/libros/${bookToDelete}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);

      showNotification("Libro eliminado", "success");
      loadBooks(); // Recargar lista de libros
    } catch (err) {
      console.error("Error eliminando libro", err);
      showNotification(`Error eliminando libro: ${err.message}`, "error");
    } finally {
      hideConfirmModal();
    }
  }

  function hideConfirmModal() {
    if (!elements.confirmModal) return; // Si no existe, no ocultar
    elements.confirmModal.classList.add("hidden");
    bookToDelete = null;
  }

  // --- Funciones para gestionar Reservas ---
  async function aprobarReserva(id) {
    try {
      const response = await fetchAPI(`/reservas/${id}/aprobar`, {
        method: "PUT",
        body: JSON.stringify({ observaciones: "Aprobada por admin" }) // Puedes pedir observaciones al admin
      });
      if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
      showNotification("Reserva aprobada", "success");
      loadReservations(); // Recargar lista de reservas
    } catch (err) {
      console.error("Error aprobando reserva", err);
      showNotification(`Error aprobando reserva: ${err.message}`, "error");
    }
  }

  async function rechazarReserva(id) {
    const motivo = prompt("Ingrese el motivo del rechazo:");
    if (!motivo) return;

    try {
      const response = await fetchAPI(`/reservas/${id}/rechazar`, {
        method: "PUT",
        body: JSON.stringify({ motivo })
      });
      if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
      showNotification("Reserva rechazada", "success");
      loadReservations(); // Recargar lista de reservas
    } catch (err) {
      console.error("Error rechazando reserva", err);
      showNotification(`Error rechazando reserva: ${err.message}`, "error");
    }
  }

  // --- Funciones para gestionar Préstamos ---
  async function devolverPrestamo(id) {
    if (!confirm("¿Confirmar devolución del préstamo?")) return;

    try {
      const response = await fetchAPI(`/prestamos/${id}/devolver`, {
        method: "PUT",
      });
      if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
      showNotification("Préstamo devuelto", "success");
      loadLoans(); // Recargar lista de préstamos
    } catch (err) {
      console.error("Error devolviendo préstamo", err);
      showNotification(`Error devolviendo préstamo: ${err.message}`, "error");
    }
  }

  // --- Funciones para gestionar Usuarios ---
  async function editarUsuario(id) {
    alert(`Funcionalidad de editar usuario ${id} no implementada en este ejemplo.`);
    // Deberías abrir un formulario para editar el usuario
  }

  async function eliminarUsuario(id) {
    if (!confirm(`¿Eliminar usuario ${id}? Esta acción no se puede deshacer.`)) return;

    try {
      const response = await fetchAPI(`/usuarios/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
      showNotification("Usuario eliminado", "success");
      loadUsers(); // Recargar lista de usuarios
    } catch (err) {
      console.error("Error eliminando usuario", err);
      showNotification(`Error eliminando usuario: ${err.message}`, "error");
    }
  }

  // --- Funciones auxiliares ---
  function escapeHtml(txt) {
    const map = {
      "&": "&amp;",
      "<": "<",
      ">": ">",
      '"': "&quot;",
      "'": "&#039;",
    };
    return txt.replace(/[&<>"']/g, (m) => map[m]);
  }

  function showNotification(msg, type) {
    if (!elements.notification) return; // Si no existe el div, no mostrar
    elements.notification.textContent = msg;
    elements.notification.className = `mb-4 p-4 rounded ${
      type === "success"
        ? "bg-green-100 text-green-700 border border-green-400"
        : "bg-red-100 text-red-700 border border-red-400"
    }`;
    elements.notification.classList.remove("hidden");
    setTimeout(() => elements.notification.classList.add("hidden"), 5000);
  }

  function showLoading(show) {
    if (!elements.loadingSpinner) return; // Si no existe el spinner, no mostrar/ocultar
    if (show) elements.loadingSpinner.classList.remove("hidden");
    else elements.loadingSpinner.classList.add("hidden");
  }

  // --- Inicializar aplicación ---
  async function initializeApp() {
    await initializeElements();
    await setupEventListeners();
    // Cargar la vista de libros por defecto o la que esté activa
    showView('libros'); // Cambia esto si quieres que empiece en otra vista por defecto
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeApp);
  } else {
    initializeApp();
  }

  // Hacer funciones disponibles globalmente para los onclick en el HTML
  window.editBook = editBook;
  window.deleteBook = deleteBook;
  window.aprobarReserva = aprobarReserva;
  window.rechazarReserva = rechazarReserva;
  window.devolverPrestamo = devolverPrestamo;
  window.editarUsuario = editarUsuario;
  window.eliminarUsuario = eliminarUsuario;
}