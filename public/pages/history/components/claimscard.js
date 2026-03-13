export const claimscard = (data) => {

        const client = data.IdClient || {};
        const recurrence = data.Idrecurrence || {};
        const severity = data.Idseverity || {};
        const typeName = client.IdType?.name || 'N/A';
        const employee = data.IdEmployee ||{};
        const service = data.IdService ||{};


        return `

<div class="bg-white m-3 rounded-xl p-6 shadow-md hover:shadow-lg border border-gray-200 transition-all duration-300 relative flex flex-col gap-6">

    <div class="flex flex-wrap justify-between items-start border-b border-gray-100 pb-4 gap-4">
        <div>
            <span class="text-xs text-gray-400 uppercase tracking-wider font-semibold">Reclamo N°</span>
            <h3 id="number-${data._id}" class="text-2xl font-black text-sky-700">#${data.claimNumber}</h3>
            <p id="type-${data._id}" class="text-sm font-medium text-gray-600 mt-1">Tipo: ${typeName}</p>
        </div>
        <div class="flex gap-2 text-right">
            <span id="severity-${data._id}" class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-stone-100 text-stone-700 border border-stone-200">
                Gravedad: ${severity.name}
            </span>
            <span id="resolutionTime-${data._id}" class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200">
                ⏱ ${data.resolutionTime}
            </span>
        </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-y-6 gap-x-4">
        
        <div class="col-span-1">
            <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Cliente</p>
            <p id="name-${data._id}" class="font-bold text-gray-900">${client.name}</p>
            <p id="adress-${data._id}" class="text-sm text-gray-600 mt-1">📍 ${client.address}</p>
        </div>

        <div class="col-span-1">
            <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Servicio / Recurrencia</p>
            <p id="service-${data._id}" class="font-bold text-gray-900">${service.name}</p>
            <p id="recurrence-${data._id}" class="text-sm text-gray-600 mt-1"> ${recurrence.name}</p>
        </div>

        <div class="col-span-1">
            <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Técnico Asignado</p>
            <p id="employee-${data._id}" class="font-bold text-gray-900">👷‍♂️ ${employee.name}</p>
        </div>

        <div class="col-span-1">
            <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Fechas</p>
            <p id="date-call-${data._id}" class="text-sm text-gray-800"><span class="font-medium text-gray-500">Apertura:</span> ${data.date}</p>
            <p id="dateResolution-${data._id}" class="text-sm text-gray-800 mt-1"><span class="font-medium text-gray-500">Cierre:</span> ${data.dateResolution}</p>
        </div>
    </div>

    <div class="flex flex-col gap-4 mt-2">
        <div class="bg-amber-50 rounded-lg p-4 border-l-4 border-amber-400">
            <p class="text-xs text-amber-800 uppercase tracking-wider font-bold mb-2">Motivo del Reclamo</p>
            <p id="desc-${data._id}" class="text-sm text-amber-900 italic">"${data.desc}"</p>
        </div>

        <div class="bg-sky-50 rounded-lg p-4 border-l-4 border-sky-500">
            <p class="text-xs text-sky-800 uppercase tracking-wider font-bold mb-2">Detalles Técnicos (Resolución)</p>
            <p id="desc-tec-${data._id}" class="text-sm text-sky-900">"${data.descTec}"</p>
        </div>
    </div>

</div>
`}