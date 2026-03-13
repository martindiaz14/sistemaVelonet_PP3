import { navbar } from "../../general-components/nav.js";
import { claimscard } from "./components/claimscard.js";
import { addclaimsByState, searchClaims, filterClaims, generatePredefinedReport } from "../../APIs/claims.api.js";
import { setupReportListeners } from './components/reports/report-preview.js';
import { setData } from "../../utils/localStorage.js";
import { addclientsOptions } from "../../APIs/clients.api.js";


const renderNavbar = () => {
    const navbarContainer = document.getElementById('header');
    navbarContainer.innerHTML = navbar();
};

let allClients = [];
const loadDatalist = async () => {
    try {
        allClients = await addclientsOptions();
        const dataList = document.getElementById('clients-list');
        if (dataList) {
            dataList.innerHTML = '';
            allClients.forEach(c => {
                const option = document.createElement('option');
                option.value = `${c.name} (#${c._id.slice(-4)})`;
                dataList.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Error cargando Reclamos:", error);
    }
};

document.addEventListener('DOMContentLoaded', renderNavbar)

async function handleReportActions() {
    const reportKey = document.getElementById('report-key-select').value;
    const timeSelectElement = document.getElementById('time-select');
    const dateFromElement = document.getElementById('date-from');
    const dateToElement = document.getElementById('date-to');


    const timePeriod = timeSelectElement ? timeSelectElement.value : 'Personalizado';
    const dateFrom = dateFromElement ? dateFromElement.value : '';
    const dateTo = dateToElement ? dateToElement.value : '';




    const reportPopup = document.getElementById('popup-div');


    if (!reportKey) {
        alert('Por favor, selecciona un tipo de reporte predefinido.');
        return;
    }

    let periodCleaned = timePeriod;
    let dateFromCleaned = dateFrom;
    let dateToCleaned = dateTo;

    if (timePeriod !== 'Personalizado') {
        dateFromCleaned = '';
        dateToCleaned = '';
    } else if (timePeriod === 'Personalizado' && dateFrom === '' && dateTo === '') {
        periodCleaned = 'Todo';
    }

    const reportOptions = { reportKey, period: periodCleaned, dateFrom: dateFromCleaned, dateTo: dateToCleaned };

    if (reportPopup) reportPopup.classList.add('hidden');

    try {
        const reportData = await generatePredefinedReport(reportOptions);

        setData('currentReportData', reportData);
        setData('currentReportOptions', reportOptions);

        window.open('./components/reports/report-preview.html', '_blank', 'width=1200,height=800,scrollbars=yes');

    } catch (error) {
        alert(`Error al generar el reporte. Ver consola para más detalles.`);
        console.error("Error en la generación del reporte:", error);
    }
}
document.addEventListener('change', (e) => {
    if (e.target.id === 'time-select') {
        // Buscamos el elemento dentro del evento para asegurar que existe
        const popupDate = document.getElementById('popup-div-date');
        
        
        const dateFrom = document.getElementById('date-from');
        const dateTo = document.getElementById('date-to');

        if (!popupDate) return;

        if (e.target.value === 'Personalizado') {
            // Quitamos la clase de Tailwind Y el estilo en línea
            popupDate.classList.remove('hidden');
            popupDate.style.display = 'block'; 
        } else {
            // Volvemos a ocultar
            popupDate.classList.add('hidden');
            popupDate.style.display = 'none';

                        if (dateFrom) dateFrom.value = '';
            if (dateTo) dateTo.value = '';
        }
    }
});


document.addEventListener('change', (e) => {
    if (e.target.id === 'time-filter-select') {
        const popupDate = document.getElementById('filter-div-date');
        
        
        const dateFrom = document.getElementById('date-filter-from');
        const dateTo = document.getElementById('date-filter-to');

        if (!popupDate) return;

        if (e.target.value === 'P') {
            popupDate.classList.remove('hidden');
            popupDate.style.display = 'block'; 
        } else {
            popupDate.classList.add('hidden');
            popupDate.style.display = 'none';

            if (dateFrom) dateFrom.value = '';
            if (dateTo) dateTo.value = '';
        }
    }
});



document.addEventListener('DOMContentLoaded', async () => {
    setupReportListeners(handleReportActions);
});
const renderclaims = async () => {

    const claims = await addclaimsByState('closed');

    const container = document.getElementById("container")

    let claimscon = ``
    container.innerHTML = claimscon

    claims.forEach(e => {
        claimscon += claimscard(e)
    });
    container.innerHTML = claimscon
}

document.addEventListener('DOMContentLoaded', async () => {
    await renderclaims();
})

document.addEventListener('click', function (event) {

    const targetElement = event.target;
    const reportPopup = document.getElementById('popup-div');

    if (targetElement && targetElement.id === 'report-button') {

        if (reportPopup) {
            reportPopup.classList.toggle('hidden');
        }

        return;
    }

    const isReportPopupVisible = reportPopup && !reportPopup.classList.contains('hidden');

    const isClickInsideReportArea =
        targetElement.closest('#popup-div') ||
        targetElement.closest('#report-button');

    if (isReportPopupVisible && !isClickInsideReportArea) {
        reportPopup.classList.add('hidden');
    }
});

document.addEventListener('click', function (event) {

    const targetElement = event.target;
    const reportPopup = document.getElementById('popup-filter-div');

    if (targetElement && targetElement.id === 'filter-button') {

        if (reportPopup) {
            reportPopup.classList.toggle('hidden');
        }

        return;
    }

    const isReportPopupVisible = reportPopup && !reportPopup.classList.contains('hidden');

    const isClickInsideReportArea =
        targetElement.closest('#popup-filter-div') ||
        targetElement.closest('#filter-button');

    if (isReportPopupVisible && !isClickInsideReportArea) {
        reportPopup.classList.add('hidden');
    }
});



const CURRENT_CLAIM_STATE = 2;
let searchTimeout;

const displayClaims = (claims) => {
    let claimscon = ``;
    if (!claims || claims.length === 0) {
        claimscon = `<li class="text-white text-center p-4 bg-sky-700 rounded-lg shadow-lg m-4">No se encontraron reclamos que coincidan con la búsqueda.</li>`;
    } else {
        claims.forEach(e => {
            claimscon += claimscard(e)
        });
    }
    container.innerHTML = claimscon
};

const rendersearchclaims = async () => {
    const claims = await addclaimsByState('closed');
    displayClaims(claims);
};

const handleSearch = (event) => {
    clearTimeout(searchTimeout);

    const searchTerm = event.target.value.trim();

    if (searchTerm === '') {
        rendersearchclaims();
        return;
    }

    searchTimeout = setTimeout(async () => {
        try {
            const results = await searchClaims(searchTerm, CURRENT_CLAIM_STATE);
            displayClaims(results);
        } catch (error) {
            console.error("Error al buscar reclamos:", error);
            displayClaims([]);
        }
    }, 300);
};

document.addEventListener('DOMContentLoaded', () => {
    searchInput.addEventListener('input', handleSearch);
    renderclaims();
});


const searchInput = document.getElementById("searchInput");
const container = document.getElementById("container");


const timeSelect = document.getElementById("time-filter-select");
const dateFromInput = document.getElementById("date-filter-from");
const dateToInput = document.getElementById("date-filter-to");
const typeSelect = document.getElementById("type-select");
const severitySelect = document.getElementById("severity-select");
const recurrenceSelect = document.getElementById("recurrence-select");
const serviceSelect = document.getElementById("service-select");
const getFilterValues = () => {
    return {
        state: CURRENT_CLAIM_STATE,
        time: timeSelect ? timeSelect.value : null,
        dateFrom: dateFromInput ? dateFromInput.value : null,
        dateTo: dateToInput ? dateToInput.value : null,
        type: typeSelect ? typeSelect.value : null,
        severity: severitySelect ? severitySelect.value : null,
        recurrence: recurrenceSelect ? recurrenceSelect.value : null,
        service: serviceSelect ? serviceSelect.value : null,
    };
};



document.addEventListener('DOMContentLoaded', async () => {
    renderNavbar();
    await loadDatalist();
    
    const storedSearchTerm = localStorage.getItem('clientSearchTerm');
    
    if (storedSearchTerm && searchInput) {
        searchInput.value = storedSearchTerm;
        localStorage.removeItem('clientSearchTerm');
        
        const claims = await searchClaims(storedSearchTerm, CURRENT_CLAIM_STATE);
        displayClaims(claims);
    } 

    else if (searchInput && searchInput.value.trim() !== '') {
        const claims = await searchClaims(searchInput.value.trim(), CURRENT_CLAIM_STATE);
        displayClaims(claims);
    } 
    else {
        await renderclaims();
    }
});