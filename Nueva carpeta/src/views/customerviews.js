// src/views/customerviews.js
export function customerViews() {
  return `
    <style>
        .alert {
            animation: slideIn 0.3s ease-out;
        }
        
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        .fade-in {
            animation: fadeIn 0.3s ease-in;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .view-section {
            display: none;
        }

        .view-section.active {
            display: block;
        }
    </style>
    <body class="bg-gray-50 min-h-screen">
        <!-- Alertas -->
        <div id="successAlert" class="hidden fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 max-w-md">
            <div class="flex items-center">
                <span id="successMessage" class="font-medium"></span>
            </div>
        </div>

        <div id="errorAlert" class="hidden fixed top-4 right-4 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 max-w-md">
            <div class="flex items-center">
                <span id="errorMessage" class="font-medium"></span>
            </div>
        </div>

        <div class="container mx-auto px-4 py-8 max-w-7xl">
            <!-- Header -->
            <div class="text-center mb-8">
                <h1 class="text-4xl font-bold text-gray-800 mb-4">Sistema de Biblioteca</h1>
                <p class="text-gray-600">Gestiona tus libros y reservas</p>
            </div>
            
            <!-- User Info y Tabs -->
            <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-8">
                <div class="flex flex-col lg:flex-row justify-between items-center space-y-4 lg:space-y-0">
                    <div>
                        <p class="text-gray-600 text-sm">Bienvenido,</p>
                        <p class="text-xl font-semibold text-blue-800" id="userName">Usuario</p>
                    </div>
                    <div class="flex flex-wrap justify-center gap-2"> <!-- Cambiado a flex wrap para responsive -->
                        <button id="tabLibrosDispBtn" class="active:bg-blue-100 active:text-blue-700 px-3 py-2 font-medium text-sm rounded-md bg-white text-gray-700 hover:bg-gray-100 border border-gray-300">
                            Libros Disponibles (<span id="availableBooksCount">0</span>)
                        </button>
                        <button id="tabFavoritosBtn" class="px-3 py-2 font-medium text-sm rounded-md bg-white text-gray-700 hover:bg-gray-100 border border-gray-300">
                            Mis Favoritos (<span id="favoritesCount">0</span>)
                        </button>
                        <button id="tabReservasBtn" class="px-3 py-2 font-medium text-sm rounded-md bg-white text-gray-700 hover:bg-gray-100 border border-gray-300">
                            Mis Reservas (<span id="reservationsCount">0</span>)
                        </button>
                        <!-- Opcional: Botón para préstamos si se implementa en user.js -->
                        <!--
                        <button id="tabPrestamosBtn" class="px-3 py-2 font-medium text-sm rounded-md bg-white text-gray-700 hover:bg-gray-100 border border-gray-300">
                            Mis Préstamos
                        </button>
                        -->
                        <button id="refreshBooksBtn" class="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-sm">
                            Actualizar
                        </button>
                        <button id="logoutBtn" class="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded text-sm">
                            Salir
                        </button>
                    </div>
                </div>
            </div>

            <!-- Main Content -->
            <div class="bg-white rounded-xl shadow-lg overflow-hidden">
                <!-- Sección: Libros Disponibles -->
                <div id="availableBooksSection" class="view-section active p-6">
                    <h2 class="text-2xl font-bold text-gray-800 mb-6">Libros Disponibles</h2>
                    <div id="availableBooksContainer">
                        <div class="text-center py-12">
                            <p class="text-gray-500">Cargando libros disponibles...</p>
                        </div>
                    </div>
                </div>

                <!-- Sección: Favoritos -->
                <div id="myFavoritesSection" class="view-section p-6">
                    <h2 class="text-2xl font-bold text-gray-800 mb-6">Mis Libros Favoritos</h2>
                    <div id="myFavoritesContainer">
                        <div class="text-center py-12">
                            <p class="text-gray-500">Cargando favoritos...</p>
                        </div>
                    </div>
                </div>

                <!-- Sección: Reservas -->
                <div id="myReservationsSection" class="view-section p-6">
                    <h2 class="text-2xl font-bold text-gray-800 mb-6">Mis Reservas</h2>
                    <div id="myReservationsContainer">
                        <div class="text-center py-12">
                            <p class="text-gray-500">Cargando reservas...</p>
                        </div>
                    </div>
                </div>

                <!-- Sección: Préstamos (Opcional) -->
                <!--
                <div id="myLoansSection" class="view-section p-6">
                    <h2 class="text-2xl font-bold text-gray-800 mb-6">Mis Préstamos</h2>
                    <div id="myLoansContainer">
                        <div class="text-center py-12">
                            <p class="text-gray-500">Cargando préstamos...</p>
                        </div>
                    </div>
                </div>
                -->

            </div>

            
        </div>
    </body>
  `;
}