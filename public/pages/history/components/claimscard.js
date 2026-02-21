export const claimscard = (data) => {

        const client = data.IdClient || {};
        const recurrence = data.Idrecurrence || {};
        const severity = data.Idseverity || {};
        const typeName = client.IdType?.name || 'N/A';
        const employee = data.IdEmployee ||{};


        return `

    <div
            class="bg-stone-50 m-3 text-black font-awesome font-medium text-sm rounded-lg p-6 grid grid-cols-4 grid-rows-3 gap-6 relative">

            <p id="name-${data._id}" class="col-span-1">Nombre/y Apellido: <span class="font-bold">${client.name}</span></p>
            <p id="adress-${data._id}" class="col-span-1">Direccion: <span class="font-bold">${client.address}</span></p>
            <p id="phone-${data._id}" class="col-span-1">Tel:  <span class="font-bold">${client.phone}</span></p>
            <p id="employee-${data._id}" class="col-span-1">Tecnico Asignado: <span class="font-bold">${employee.name}</span></p>
            

            <p id="date-call-${data._id}" class="col-span-1">Fecha de Llamado:<span class="font-bold">${data.date}</span></p>
            <p id="recurrence-${data._id}" class="col-span-1">Recurrencia: <span class="font-bold">${recurrence.name}</span></p>
            <p id="number-${data._id}" class="col-span-1">N°: <span class="font-bold">${data.claimNumber}</span></p>
            <p id="type-${data._id}" class="col-span-1">Tipo: <span class="font-bold">${typeName}</span></p>

            <p id="desc-${data._id}" class="col-span-4 pr-14">Descripcion: <span class="font-bold">${data.desc}</span></p>

            <p id="dateResolution-${data._id}" class="col-span-1">Fecha de Resolucion: <span class="font-bold">${data.dateResolution}</span></p>
            <p id="resolutionTime-${data._id}" class="col-span-1">Tiempo de Resolucion: <span class="font-bold">${data.resolutionTime}</span></p>
            <p id="severity-${data._id}" class="col-span-1">Gravedad: <span class="font-bold">${severity.name}</span></p>

             <p id="desc-tec-${data._id}" class="col-span-4 pr-14">Detalles Tecnicos: <span class="font-bold">${data.descTec}</span> </p>
        </div>
`}