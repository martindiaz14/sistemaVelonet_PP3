export const claimscard = (data) => {

        const client = data.IdClient || {};
        const recurrence = data.Idrecurrence || {};
        const severity = data.Idseverity || {};
        const typeName = client.IdType?.name || 'N/A';


        return `

    <div
            class="bg-stone-50 m-3 text-black font-awesome font-medium text-sm rounded-lg p-6 grid grid-cols-4 grid-rows-3 gap-6 relative">

            <p id="name-${data._id}" class="col-span-1">Nombre/y Apellido: ${client.name} </p>
            <p id="adress-${data._id}" class="col-span-1">Direccion: ${client.address}</p>
            <p id="phone-${data._id}" class="col-span-1">Tel: ${client.phone}</p>
            <p id="dni-${data._id}" class="col-span-1">DNI: ${client.dni}</p>

            <p id="date-call-${data._id}" class="col-span-1">Fecha de Llamado: ${data.date}</p>
            <p id="recurrence-${data._id}" class="col-span-1">Recurrencia: ${recurrence.name}</p>
            <p id="number-${data._id}" class="col-span-1">N°: ${data.claimNumber}</p>
            <p id="type-${data._id}" class="col-span-1">Tipo: ${typeName}</p>

            <p id="desc-${data._id}" class="col-span-4 pr-14">Descripcion: ${data.desc}</p>

            <p id="dateResolution-${data._id}" class="col-span-1">Fecha de Resolucion: ${data.dateResolution} </p>
            <p id="resolutionTime-${data._id}" class="col-span-1">Tiempo de Resolucion: ${data.resolutionTime}</p>
            <p id="severity-${data._id}" class="col-span-1">Gravedad: ${severity.name}</p>

             <p id="desc-tec-${data._id}" class="col-span-4 pr-14">Detalles Tecnicos: ${data.descTec} </p>
        </div>
`}