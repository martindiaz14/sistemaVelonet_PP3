export const claimscard = (data) => {

    const client = data.IdClient || {};
    const recurrence = data.Idrecurrence || {};
    const employee = data.IdEmployee || {};
    const service = data.IdService || {};

    const typeName = client.IdType?.name || 'N/A';


    return `

<div class="bg-white m-3 rounded-xl p-6 shadow-md hover:shadow-lg border border-gray-200 border-l-4 border-l-sky-600 transition-all duration-300 relative flex flex-col gap-6 claim-card" id="${data._id}">

    <div class="flex flex-wrap justify-between items-start border-b border-gray-100 pb-4 pr-32 gap-4">
        <div>
            <span class="text-xs text-gray-400 uppercase tracking-wider font-semibold">Reclamo N°</span>
            <h3 id="number-${data._id}" class="text-2xl font-black text-sky-700">#${data.claimNumber}</h3>
            <p id="type-${data._id}" class="text-sm font-medium text-gray-600 mt-1">Tipo: ${typeName}</p>
        </div>
        <div class="flex gap-2 text-right">
            <span id="recurrence-${data._id}" class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-stone-100 text-stone-700 border border-stone-200">
                Recurrencia: ${recurrence.name}
            </span>
        </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-4 pr-32">
        
        <div class="col-span-1">
            <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Cliente</p>
            <p id="name-${data._id}" class="font-bold text-gray-900">${client.name}</p>
            <p id="adress-${data._id}" class="text-sm text-gray-600 mt-1">📍 ${client.address}</p>
        </div>

        <div class="col-span-1">
            <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Servicio</p>
            <p id="service-${data._id}" class="font-bold text-gray-900">${service.name}</p>
            <p id="date-call-${data._id}" class="text-sm text-gray-800 mt-1"><span class="font-medium text-gray-500">Apertura:</span> ${data.date}</p>
        </div>

        <div class="col-span-1">
            <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Técnico Asignado</p>
            <p id="employee-${data._id}" class="font-bold text-gray-900">👷‍♂️ ${employee.name}</p>
        </div>
    </div>

    <div class="bg-amber-50 rounded-lg p-4 border-l-4 border-amber-400 w-full md:w-4/5 lg:w-3/4">
        <p class="text-xs text-amber-800 uppercase tracking-wider font-bold mb-2">Motivo del Reclamo</p>
        <p id="desc-${data._id}" class="text-sm text-amber-900 italic">"${data.desc}"</p>
    </div>
            <button id="open-popup-btn"
                class="absolute bottom-4 right-4 bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded shadow-lg">
                🏳️
            </button>
            <div id="popup-div-${data._id}"
                    class="absolute claim-card hidden bg-white p-5 bottom-8 right-16 rounded-xl shadow-2xl border border-gray-100 space-y-4 z-10 w-96 transform transition-all duration-300">

                <div class="border-b border-gray-200 pb-2">
                <h3 class="text-lg font-bold text-gray-800">Resolución de Reclamo</h3>
                </div>

                <div>
                <label for="detailstec-${data._id}" class="block text-sm font-semibold text-gray-700 mb-1">
                Detalles Técnicos
                </label>
                <textarea id="detailstec-${data._id}" 
                class="w-full h-28 p-3 text-sm text-gray-800 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-none transition-shadow"
                placeholder="Describe cómo se solucionó el problema..."></textarea>
                </div>

                <div>
                <label for="severety-${data._id}" class="block text-sm font-semibold text-gray-700 mb-1">
                Nivel de Gravedad
                </label>
                <select id="severety-${data._id}" 
                class="w-full p-2.5 text-sm text-gray-800 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 cursor-pointer transition-shadow">
                <option value="Baja">Baja</option>
                <option value="Media" selected>Media</option>
                <option value="Alta">Alta</option>
                </select>
                </div>

                <div class="flex justify-end pt-2">
                <button id="report-btn-${data._id}"
                class="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white py-2 px-5 font-bold rounded-lg shadow-md hover:shadow-lg active:scale-95 close-ticket-trigger transition-all duration-200">
                Confirmar Cierre ☑︎
                </button>
                </div>
            </div>
           
        </div>
`}


document.addEventListener('click', function (event) {

    const targetElement = event.target;

    if (targetElement && targetElement.id === 'open-popup-btn') {

        document.querySelectorAll('[id^="popup-div-"]').forEach(popup => {
            popup.classList.add('hidden');
        });

        const cardElement = targetElement.closest('.claim-card');
        if (!cardElement) return;

        const claimId = cardElement.id;
        const popupDiv = cardElement.querySelector(`#popup-div-${claimId}`);

        if (popupDiv) {
            popupDiv.classList.toggle('hidden');
        } else {
            console.error(`No se encontró el popup con ID: #popup-div-${claimId}`);
        }
    }

    else {

        const isCloseButton = targetElement.classList.contains('close-ticket-trigger');

        const isClickInsidePopup =
            targetElement.id === 'open-popup-btn' ||
            targetElement.closest('[id^="popup-div-"]') ||
            targetElement.closest('#open-popup-btn');

        if (!isClickInsidePopup && !isCloseButton) {

            document.querySelectorAll('[id^="popup-div-"]').forEach(popup => {
                popup.classList.add('hidden');
            });
        }
    }
});