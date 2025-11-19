export const clientscard = (data) => {

    const type = data.IdType || {};
    // AÑADIDA LA CLASE 'client-card' AQUÍ
    return `
        <div
            class="bg-stone-50 m-6 pt-10 pb-20 px-10 text-black font-medium text-sm rounded-lg flex flex-col items-start relative w-80 shadow-lg client-card" id ="${data._id}">

            <div class="w-full flex justify-center mb-4">
                <img src="./assets/default.jpg" alt="Profile Picture"
                    class="w-32 h-32 object-cover rounded-full border-2 border-black">
            </div>

            <div class="space-y-2 w-full mt-4">

                <p id="name-${data._id}">Nombre/y Apellido: <span class="font-bold">${data.name}</span></p>
                <p id="dni-${data._id}">DNI: <span class="font-bold">XXXXXXXXX</span></p>
                <p id="adress-${data._id}">Direccion: <span class="font-bold">${data.address}</span></p>
                <p id="phone-${data._id}">Tel: <span class="font-bold">${data.phone}</span></p>
                <hr class="border-gray-300">
                <p id="type-${data._id}">Tipo: <span class="font-bold">${type.name}</span></p>
                <p id="count-call-${data._id}">Cant. Llamados: <span class="font-bold">${data.count_calls}</span></p>
                <p id="last_rating-${data._id}">Ultima Calificacion: <span class="font-bold">${data.last_rating}</span></p>
            </div>
            <div class="absolute bottom-4 right-4">
                <button data-client-name="${data.name}" id="hist-button-${data._id}" class="hist-button-trigger bg-sky-600 text-white rounded-lg px-4 py-2 shadow-md hover:bg-sky-700">
                    Historial
                </button>
            </div>
     </div>
`}


document.addEventListener('click', function (event) {

    const targetElement = event.target;

    // Lógica para ABRIR el pop-up de Reporte (se mantiene)
    if (targetElement && targetElement.id === 'open-popup-btn') {
        document.querySelectorAll('[id^="popup-div-"]').forEach(popup => {
            popup.classList.add('hidden');
        });

        // Se busca la clase corregida 'client-card'
        const cardElement = targetElement.closest('.client-card');
        if (!cardElement) return;

        const clientId = cardElement.id;
        const popupDiv = cardElement.querySelector(`#popup-div-${clientId}`);

        if (popupDiv) {
            popupDiv.classList.toggle('hidden');
        } else {
            console.error(`No se encontró el popup con ID: #popup-div-${clientId}`);
        }
    }

    // NUEVA LÓGICA: Manejar el clic en el botón "Historial" (hist-button-trigger)
    if (targetElement && targetElement.classList.contains('hist-button-trigger')) {
        event.preventDefault(); // Evitamos la acción predeterminada si el botón fuera un enlace

        // Obtener el nombre del cliente desde el atributo data-
        const clientName = targetElement.getAttribute('data-client-name');

        if (clientName) {
            // Guardar el nombre del cliente en localStorage
            localStorage.setItem('clientSearchTerm', clientName);

            // Redirigir a la página principal de reclamos (que está configurada en la ruta '/')
            window.location.href = '../home/';
        }
    }

    // Lógica para CERRAR pop-ups al hacer clic fuera (se actualiza el chequeo)
    else {
        const reportButton = targetElement.classList.contains('report-trigger');
        const isClickInsidePopup =
            targetElement.id === 'open-popup-btn' ||
            targetElement.closest('[id^="popup-div-"]') ||
            targetElement.closest('#open-popup-btn');

        // Se asegura de no cerrar si el clic es en un botón de historial
        if (!isClickInsidePopup && !reportButton && !targetElement.classList.contains('hist-button-trigger')) {
            document.querySelectorAll('[id^="popup-div-"]').forEach(popup => {
                popup.classList.add('hidden');
            });
        }
    }
});
