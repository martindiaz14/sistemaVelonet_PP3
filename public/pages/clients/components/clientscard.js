export const clientscard = (data) => {

    const type = data.IdType || {};
    // AÑADIDA LA CLASE 'client-card' AQUÍ
    return `
    <div class="bg-white m-4 p-6 rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 transition-all duration-300 w-80 relative flex flex-col items-center client-card group" id="${data._id}">

    <span id="type-${data._id}" class="absolute top-5 left-5 px-3 py-1 bg-sky-100 text-sky-700 text-[10px] font-bold uppercase rounded-full tracking-wider border border-sky-200">
        ${type.name}
    </span>

    <div class="relative mt-2 mb-4">
        <img src="./assets/default.jpg" alt="Profile Picture"
             class="w-24 h-24 object-cover rounded-full ring-4 ring-gray-50 shadow-md group-hover:ring-sky-100 transition-all duration-300">
        <div class="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
    </div>

    <div class="text-center w-full mb-4">
        <h3 id="name-${data._id}" class="text-xl font-black text-gray-800 leading-tight">${data.name}</h3>
    </div>

    <div class="w-full space-y-3 mb-6 bg-stone-50 p-4 rounded-xl border border-stone-100">
        <div class="flex items-start text-sm text-gray-600">
            <span class="mr-2 text-sky-600 mt-0.5">📍</span>
            <span id="adress-${data._id}" class="leading-tight break-words">${data.address}</span>
        </div>
        <div class="flex items-center text-sm text-gray-600">
            <span class="mr-2 text-sky-600">📞</span>
            <span id="phone-${data._id}" class="font-medium">${data.phone}</span>
        </div>
    </div>

    <div class="flex w-full justify-between border-t border-gray-100 pt-4 mb-6">
        <div class="text-center w-1/2 border-r border-gray-100">
            <p class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Llamados</p>
            <p id="count-call-${data._id}" class="text-xl font-black text-gray-700">${data.count_calls}</p>
        </div>
        <div class="text-center w-1/2">
            <p class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Calificación</p>
            <p id="last_rating-${data._id}" class="text-xl font-black text-amber-500 flex justify-center items-center gap-1">
                ${data.last_rating} <span class="text-sm">⭐</span>
            </p>
        </div>
    </div>

    <button data-client-name="${data.name}" id="hist-button-${data._id}" 
        class="hist-button-trigger w-full bg-sky-600 text-white rounded-xl px-4 py-3 font-bold shadow-md hover:bg-sky-700 hover:shadow-lg active:scale-95 transition-all flex justify-center items-center gap-2">
        Ver Historial
        📋
    </button>
</div>
`}


document.addEventListener('click', function (event) {
    const targetElement = event.target;


    const histButton = targetElement.closest('.hist-button-trigger');

    if (histButton) {
        event.preventDefault(); 

        const clientName = histButton.getAttribute('data-client-name');

        if (clientName) {
            localStorage.setItem('clientSearchTerm', clientName);
            window.location.href = '/pages/history/';
        }
    }

    else {
        const reportButton = targetElement.classList.contains('report-trigger');
        const isClickInsidePopup =
            targetElement.id === 'open-popup-btn' ||
            targetElement.closest('[id^="popup-div-"]') ||
            targetElement.closest('#open-popup-btn');

        if (!isClickInsidePopup && !reportButton && !targetElement.closest('.hist-button-trigger')) {
            document.querySelectorAll('[id^="popup-div-"]').forEach(popup => {
                popup.classList.add('hidden');
            });
        }
    }
});