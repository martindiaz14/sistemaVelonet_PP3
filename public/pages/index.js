import { navbar } from "../general-components/nav.js";
import { addclaimsByState, closeClaim, searchClaims, filterClaims } from "../APIs/claims.api.js";
import { claimscard } from "../general-components/claimscard.js"

const CURRENT_CLAIM_STATE = 1;
let searchTimeout;

const renderNavbar = () => {
    const navbarContainer = document.getElementById('header');
    navbarContainer.innerHTML = navbar();
};

document.addEventListener('DOMContentLoaded', renderNavbar)

document.addEventListener('change', (event) => {
    if (event.target && event.target.id === 'time-select') {
        const timeSelect = event.target;
        const popupDivDate = document.getElementById('popup-div-date');

        const dateFrom = document.getElementById('date-from');
        const dateTo = document.getElementById('date-to');

        console.log("Evento capturado. Valor:", timeSelect.value);

        if (timeSelect.value === 'P') {
            popupDivDate.classList.remove('hidden');
            popupDivDate.style.display = 'block'; 
        } else {
            popupDivDate.classList.add('hidden');
            popupDivDate.style.display = 'none';

            if (dateFrom) dateFrom.value = '';
            if (dateTo) dateTo.value = '';
        }
    }
});

document.addEventListener('click', function (event) {
    
    const targetElement = event.target;
    const reportPopup = document.getElementById('popup-div');

    if (targetElement && targetElement.id === 'filter-button') {
        
        if (reportPopup) {
            reportPopup.classList.toggle('hidden');
        }
        
        return; 
    } 
    
    const isReportPopupVisible = reportPopup && !reportPopup.classList.contains('hidden');

    const isClickInsideReportArea = 
        targetElement.closest('#popup-div') || 
        targetElement.closest('#filter-button') ;

    if (isReportPopupVisible && !isClickInsideReportArea) {
        reportPopup.classList.add('hidden');
    }
});

document.addEventListener('click', function (event) {
    if (event.target && event.target.id === 'open-popup-btn') {
        document.querySelectorAll('[id^="popup-div-"]').forEach(popup => {
            popup.classList.add('hidden');
        });

        const cardElement = event.target.closest('.claim-card');
        if (!cardElement) return;

        const claimId = cardElement.id;
        const popupDiv = cardElement.querySelector(`#popup-div-${claimId}`);

        if (popupDiv) {
            popupDiv.classList.toggle('hidden');
        }
    }

    if (event.target && event.target.classList.contains('close-ticket-trigger')) {
        event.preventDefault();
        handleCloseTicket(event);
    }
});



const displayClaims = (claims) => {
    let claimscon = ``;
    if (!claims || claims.length === 0) {
        claimscon = `<li class="text-white text-center p-4 bg-sky-700 rounded-lg shadow-lg m-4">No se encontraron que coincidan con la búsqueda.</li>`;
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

const renderclaims = async () => {

    const claims = await addclaimsByState('open')
    const container = document.getElementById("container")

    let claimscon = ``
    container.innerHTML = claimscon

    claims.forEach(e => {
        claimscon += claimscard(e)
    });
    container.innerHTML = claimscon

}

document.addEventListener('DOMContentLoaded', async () => {
    await renderclaims()
})

const handleCloseTicket = async (event) => {
    const cardElement = event.target.closest('.claim-card');
    if (!cardElement) return;

    const claimId = cardElement.id;

    const descTecElement = document.getElementById(`detailstec-${claimId}`);
    const severityElement = document.getElementById(`severety-${claimId}`);
    const popupDiv = document.getElementById(`popup-div-${claimId}`);

    const descTec = descTecElement.value.trim();
    const severityLabel = severityElement.value;

    if (descTec.length < 10) {
        alert("Por favor, ingrese una descripción técnica detallada (mínimo 10 caracteres).");
        return;
    }

    const updateData = {
        descTec: descTec,
        severityLabel: severityLabel,
    };

    try {
        const result = await closeClaim(claimId, updateData);

        if (result && result.success) {
            popupDiv.classList.add('hidden');
            alert(`Ticket N° ${claimId} cerrado exitosamente. Tiempo de resolución: ${result.claim.resolutionTime}`);

            cardElement.remove();

        } else {
            alert("Error al intentar cerrar el ticket: El servidor no lo procesó.");
        }
    } catch (error) {
        console.error("Fallo al cerrar el ticket:", error);
        alert("Ocurrió un error de red o servidor al cerrar el ticket.");
    }
};





document.addEventListener('DOMContentLoaded', async () => {
    renderNavbar();
    
    const storedSearchTerm = localStorage.getItem('clientSearchTerm');
    const searchInput = document.getElementById("searchInput");

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
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
});


const searchInput = document.getElementById("searchInput");
const container = document.getElementById("container");
const filterPopupDiv = document.getElementById("popup-div");
const applyFiltersButton = document.getElementById("apply-btn"); 


const timeSelect = document.getElementById("time-select");
const dateFromInput = document.getElementById("date-from");
const dateToInput = document.getElementById("date-to");
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