// src/views/adminviews.js
export function adminViews() {
  return `
    <body class="bg-gray-100 p-6">
        <div class="max-w-7xl mx-auto">
            <!-- Encabezado -->
            <header class="flex justify-between items-center mb-6">
                <h1 class="text-2xl font-bold text-gray-800">Panel de Administración</h1>
                <button id="logoutBtn" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition">
                    Cerrar Sesión
                </button>
            </header>

            <!-- Mensajes de notificación -->
            <div id="notification" class="hidden mb-4 p-4 rounded"></div>

            <!-- Tabs para navegación entre vistas de admin -->
            <div class="border-b border-gray-200 mb-6">
                <nav class="flex space-x-4">
                    <button id="tabLibrosBtn" class="active:bg-blue-100 active:text-blue-700 px-3 py-2 font-medium text-sm rounded-md bg-white text-gray-700 hover:bg-gray-100 border border-gray-300">
                        Libros
                    </button>
                    <button id="tabReservasBtn" class="px-3 py-2 font-medium text-sm rounded-md bg-white text-gray-700 hover:bg-gray-100 border border-gray-300">
                        Reservas
                    </button>
                    <button id="tabPrestamosBtn" class="px-3 py-2 font-medium text-sm rounded-md bg-white text-gray-700 hover:bg-gray-100 border border-gray-300">
                        Préstamos
                    </button>
                    <button id="tabUsuariosBtn" class="px-3 py-2 font-medium text-sm rounded-md bg-white text-gray-700 hover:bg-gray-100 border border-gray-300">
                        Usuarios
                    </button>
                </nav>
            </div>

            <!-- Vista de Libros -->
            <div id="librosView" class="view-section">
                <!-- Botón para mostrar formulario de libros -->
                <button id="showFormBtn" class="mb-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition">
                    Nuevo Libro
                </button>

                <!-- Formulario de libros -->
                <div id="formContainer" class="hidden bg-white p-6 rounded shadow-md mb-6">
                    <h3 id="formTitle" class="text-lg font-semibold mb-4">Agregar Nuevo Libro</h3>
                    <form id="bookForm" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="hidden" id="bookId">
                        <input type="text" id="title" placeholder="Título" class="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400" required>
                        <input type="text" id="author" placeholder="Autor" class="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400" required>
                        <input type="text" id="editorial" placeholder="Editorial" class="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400">
                        <input type="number" id="year" placeholder="Año" class="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400" min="1000" max="2050">
                        <input type="text" id="genre" placeholder="Género" class="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400">
                        <input type="text" id="code" placeholder="ISBN" class="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400" required> <!-- Cambiado de Código a ISBN -->
                        <input type="url" id="link" placeholder="Enlace" class="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 md:col-span-2">
                        <div class="md:col-span-2 flex gap-2">
                            <button type="submit" id="saveBtn" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition flex-1">
                                Guardar Libro
                            </button>
                            <button type="button" id="cancelBtn" class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded transition">
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Loading spinner -->
                <div id="loadingSpinner" class="hidden flex justify-center items-center py-8">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span class="ml-2">Cargando libros...</span>
                </div>

                <!-- Tabla de libros -->
                <div class="bg-white rounded shadow-md overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="min-w-full">
                            <thead class="bg-gray-100">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ISBN</th> <!-- Cambiado de ID a ISBN -->
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Autor</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Editorial</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Año</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Género</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enlace</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="booksTable" class="bg-white divide-y divide-gray-200"></tbody>
                        </table>
                    </div>
                    
                    <!-- Mensaje cuando no hay libros -->
                    <div id="noBooks" class="hidden p-8 text-center text-gray-500">
                        <p>No hay libros registrados</p>
                        <button class="mt-2 text-blue-500 hover:text-blue-700" onclick="document.getElementById('showFormBtn').click()">
                            Agregar el primer libro
                        </button>
                    </div>
                </div>
            </div>

            <!-- Vista de Reservas -->
            <div id="reservasView" class="view-section hidden">
                <div class="bg-white rounded shadow-md overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="min-w-full">
                            <thead class="bg-gray-100">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Libro</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Reserva</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expira</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Días Restantes</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin Aprobador</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="reservationsTable" class="bg-white divide-y divide-gray-200"></tbody>
                        </table>
                    </div>
                    <div id="noReservations" class="hidden p-8 text-center text-gray-500">
                        <p>No hay reservas registradas</p>
                    </div>
                </div>
            </div>

            <!-- Vista de Préstamos -->
            <div id="prestamosView" class="view-section hidden">
                <div class="bg-white rounded shadow-md overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="min-w-full">
                            <thead class="bg-gray-100">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ejemplar</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Libro</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Préstamo</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Devolución Esperada</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Devolución Real</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Renovaciones</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="loansTable" class="bg-white divide-y divide-gray-200"></tbody>
                        </table>
                    </div>
                    <div id="noLoans" class="hidden p-8 text-center text-gray-500">
                        <p>No hay préstamos registrados</p>
                    </div>
                </div>
            </div>

            <!-- Vista de Usuarios -->
            <div id="usuariosView" class="view-section hidden">
                <div class="bg-white rounded shadow-md overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="min-w-full">
                            <thead class="bg-gray-100">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre Completo</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correo</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado Cuenta</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Registro</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="usersTable" class="bg-white divide-y divide-gray-200"></tbody>
                        </table>
                    </div>
                    <div id="noUsers" class="hidden p-8 text-center text-gray-500">
                        <p>No hay usuarios registrados</p>
                    </div>
                </div>
            </div>

        </div>

        <!-- Modal de confirmación (puede ser reutilizado) -->
        <div id="confirmModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white p-6 rounded-lg shadow-lg max-w-sm mx-4">
                <h3 class="text-lg font-semibold mb-4">Confirmar eliminación</h3>
                <p class="text-gray-600 mb-6">¿Estás seguro de que quieres eliminar este elemento? Esta acción no se puede deshacer.</p>
                <div class="flex gap-2">
                    <button id="confirmDelete" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded flex-1 transition">
                        Eliminar
                    </button>
                    <button id="cancelDelete" class="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded flex-1 transition">
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    </body>
  `;
}