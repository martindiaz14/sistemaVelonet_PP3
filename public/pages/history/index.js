import { navbar } from "../../general-components/nav.js";
import { claimscard } from "./components/claimscard.js";
import { addclaimsByState, searchClaims, filterClaims, generatePredefinedReport } from "../../APIs/claims.api.js";
import { setupReportListeners } from './components/reports/reportModule.js';
import { setData } from "../../utils/localStorage.js";


const renderNavbar = () => {
    const navbarContainer = document.getElementById('header');
    navbarContainer.innerHTML = navbar();
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

    // 🚨 CLAVE: Asegurar la limpieza del período
    let periodCleaned = timePeriod;
    let dateFromCleaned = dateFrom;
    let dateToCleaned = dateTo;

    if (timePeriod !== 'Personalizado') {
        dateFromCleaned = '';
        dateToCleaned = '';
    } else if (timePeriod === 'Personalizado' && dateFrom === '' && dateTo === '') {
        // Opción segura si el usuario no introduce nada en el rango: usar "Todo"
        periodCleaned = 'Todo';
    }

    const reportOptions = { reportKey, period: periodCleaned, dateFrom: dateFromCleaned, dateTo: dateToCleaned };

    if (reportPopup) reportPopup.classList.add('hidden');

    try {
        const reportData = await generatePredefinedReport(reportOptions);

        setData('currentReportData', reportData);
        setData('currentReportOptions', reportOptions);

        // 🚨 Abrir nueva ventana para la vista previa
        window.open('./components/reports/report-preview.html', '_blank', 'width=1200,height=800,scrollbars=yes');

    } catch (error) {
        alert(`Error al generar el reporte. Ver consola para más detalles.`);
        console.error("Error en la generación del reporte:", error);
    }
}

// ====================================================================
// ARRANQUE DE LA APLICACIÓN
// ====================================================================

document.addEventListener('DOMContentLoaded', async () => {
    // Aquí iría el resto de tu lógica DOMContentLoaded (renderNavbar, renderclaims, etc.)

    // 🚨 CLAVE: Ejecutar el setup de listeners
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
        claimscon = `<li class="text-white text-center p-4 bg-sky-700 rounded-lg shadow-lg m-4">No se encontraron reclamos con el estado ${CURRENT_CLAIM_STATE} que coincidan con la búsqueda.</li>`;
    } else {
        claims.forEach(e => {
            claimscon += claimscard(e)
        });
    }
    container.innerHTML = claimscon
};

const rendersearchclaims = async () => {
    const claims = await addclaimsByState('open');
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
const filterPopupDiv = document.getElementById("popup-div");
const applyFiltersButton = document.getElementById("apply-btn");


const timeSelect = document.getElementById("time-filter-select");
const dateFromInput = document.getElementById("date-filter-from");
const dateToInput = document.getElementById("date-filter-to");
const typeSelect = document.getElementById("type-select");
const severitySelect = document.getElementById("severity-select");
const recurrenceSelect = document.getElementById("recurrence-select");

const getFilterValues = () => {
    return {
        state: CURRENT_CLAIM_STATE,
        time: timeSelect ? timeSelect.value : null,
        dateFrom: dateFromInput ? dateFromInput.value : null,
        dateTo: dateToInput ? dateToInput.value : null,
        type: typeSelect ? typeSelect.value : null,
        severity: severitySelect ? severitySelect.value : null,
        recurrence: recurrenceSelect ? recurrenceSelect.value : null,
    };
};

const handleApplyFilters = async () => {
    const filters = getFilterValues();

    filterPopupDiv.classList.add('hidden');

    container.innerHTML = `<div class="text-center p-8 text-xl text-gray-400">Aplicando filtros...</div>`;

    try {
        const claims = await filterClaims(filters);
        displayClaims(claims);
    } catch (error) {
        console.error("Fallo al aplicar filtros:", error);
        renderclaims();
    }
};


document.addEventListener('DOMContentLoaded', async () => {
    renderNavbar();

    const storedSearchTerm = localStorage.getItem('clientSearchTerm');

    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    if (storedSearchTerm && searchInput) {
        searchInput.value = storedSearchTerm;
        try {
            const claims = await searchClaims(storedSearchTerm, CURRENT_CLAIM_STATE);
            displayClaims(claims);
        } catch (error) {
            console.error("Fallo en la búsqueda inicial pre-cargada:", error);
            displayClaims([]);
        }
        localStorage.removeItem('clientSearchTerm');
    } else {
        await renderclaims();
    }

    if (filterPopupDiv && applyFiltersButton) {
        applyFiltersButton.addEventListener('click', handleApplyFilters);
    }
});

