export const claimscard = (data) => {

    const client = data.IdClient || {};
    const recurrence = data.Idrecurrence || {};
    const employee = data.IdEmployee || {};

    const typeName = client.IdType?.name || 'N/A';


    return `

        <div
            class="bg-stone-50 m-3 text-black font-awesome font-medium text-sm rounded-lg p-6 grid grid-cols-4 grid-rows-3 gap-4 relative claim-card" id = "${data._id}">

            <p id="name-${data._id}" class="col-span-1">Nombre/y Apellido: <span class="font-bold">${client.name}</span></p>
            <p id="adress-${data._id}" class="col-span-1">Direccion: <span class="font-bold">${client.address}</span></p>
            <p id="phone-${data._id}" class="col-span-1">Tel:  <span class="font-bold">${client.phone}</span></p>
            <p id="employee-${data._id}" class="col-span-1">Tecnico Asignado: <span class="font-bold">${employee.name}</span></p>
            

            <p id="date-call-${data._id}" class="col-span-1">Fecha de Llamado:<span class="font-bold">${data.date}</span></p>
            <p id="recurrence-${data._id}" class="col-span-1">Recurrencia: <span class="font-bold">${recurrence.name}</span></p>
            <p id="number-${data._id}" class="col-span-1">N°: <span class="font-bold">${data.claimNumber}</span></p>
            <p id="type-${data._id}" class="col-span-1">Tipo: <span class="font-bold">${typeName}</span></p>

            <p id="desc-${data._id}" class="col-span-4 pr-14">Descripcion: <span class="font-bold">${data.desc}</span></p>
            <button id="open-popup-btn"
                class="absolute bottom-4 right-4 bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded shadow-lg">
                🏳️
            </button>
            <div >

               <div id="popup-div-${data._id}"
                class="absolute claim-card hidden bg-stone-50 p-4 bottom-8 right-16 rounded-lg border-2 border-black space-y-2  z-10 w-96">

                <p class="font-bold">Detalles Tec.</p>
                <textarea id="detailstec-${data._id}" class="w-full h-32 p-2 border border-gray-300 rounded"></textarea>

                <p class="font-bold">Gravedad</p>
                <select id="severety-${data._id}" class="w-1/2 p-2 border border-gray-300 rounded">
                    <option value="Baja">Baja</option>
                    <option value="Media" selected>Media</option>
                    <option value="Alta">Alta</option>
                </select>

                <div class="flex justify-end pt-2">
                    <button id="report-btn-${data._id}"
                        class="bg-sky-700 font-bold hover:bg-sky-800 text-white py-2 px-4 text-xs rounded close-ticket-trigger">Cerrar Ticket</button>
                </div>
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