import { navbar } from "../general-components/nav.js";
import { createClaims, addclaimsByState, closeClaim, searchClaims, filterClaims } from "../APIs/claims.api.js";
import { addclientsOptions } from "../APIs/clients.api.js";
import { claimscard } from "../general-components/claimscard.js";

const container = document.getElementById("container");
const searchInput = document.getElementById("searchInput");
const filterPopupDiv = document.getElementById("popup-div");
const applyFiltersButton = document.getElementById("apply-btn");

const formContainer = document.getElementById('div-form'); 
const claimForm = document.getElementById('claim-form');   
const openBtn = document.getElementById('open-div-form');
const closeBtn = document.getElementById('close-div-form');
const cancelBtn = document.getElementById('cancel-claim');

const timeSelect = document.getElementById("time-select");
const dateFromInput = document.getElementById("date-from");
const dateToInput = document.getElementById("date-to");
const typeSelect = document.getElementById("type-select");
const severitySelect = document.getElementById("severity-select");
const recurrenceSelect = document.getElementById("recurrence-select");
const serviceSelect = document.getElementById("service-select");

const CURRENT_CLAIM_STATE = 1;
let searchTimeout;
let allClients = [];

// --- FUNCIONES DE UI ---
const renderNavbar = () => {
    const navbarContainer = document.getElementById('header');
    if (navbarContainer) navbarContainer.innerHTML = navbar();
};

const toggleModal = (show) => {
    if (show) {
        formContainer.classList.remove('hidden');
    } else {
        formContainer.classList.add('hidden');
        claimForm?.reset(); 
    }
};

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

const renderclaims = async () => {
    try {
        const claims = await addclaimsByState('open');
        displayClaims(claims);
    } catch (error) {
        console.error("Error al renderizar reclamos:", error);
    }
};

const displayClaims = (claims) => {
    if (!container) return;
    let claimscon = ``;
    if (!claims || claims.length === 0) {
        claimscon = `<li class="text-white text-center p-4 bg-sky-700 rounded-lg shadow-lg m-4 list-none">No se encontraron reclamos coincidentes.</li>`;
    } else {
        claims.forEach(e => {
            claimscon += claimscard(e);
        });
    }
    container.innerHTML = claimscon;
};

claimForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const inputValue = document.getElementById('client-search').value;
    const clientFound = allClients.find(c => `${c.name} (#${c._id.slice(-4)})` === inputValue);

    if (!clientFound) {
        alert("Por favor, selecciona un cliente válido de la lista.");
        return;
    }

    const formData = {
        IdClient: clientFound._id,
        Idservice: document.getElementById('claim-service').value,
        Idrecurrence: document.getElementById('claim-recurrence').value,
        desc: document.getElementById('claim-description').value
    };

    try {
        const res = await createClaims(formData);
        if (res) {
            alert("Reclamo creado con éxito");
            toggleModal(false);
            await renderclaims(); 
        }
    } catch (error) {
        console.error("Error en la creación:", error);
    }
});

const handleCloseTicket = async (event) => {
    const cardElement = event.target.closest('.claim-card');
    if (!cardElement) return;

    // Limpieza de ID
    const claimId = cardElement.id.replace('popup-div-', '');

    const descTecElement = document.getElementById(`detailstec-${claimId}`);
    const severityElement = document.getElementById(`severety-${claimId}`);
    const popupDiv = document.getElementById(`popup-div-${claimId}`);

    if (!descTecElement || !severityElement) return;

    const descTec = descTecElement.value.trim();

    const severityLabel = severityElement.options[severityElement.selectedIndex].text;


    if (descTec.length < 10) {
        alert("La descripción técnica debe tener al menos 10 caracteres.");
        return;
    }

    try {
        const result = await closeClaim(claimId, { descTec, severityLabel });

        if (result && result.success) {
            alert(`Ticket cerrado. Tiempo: ${result.claim.resolutionTime}`);
            cardElement.remove();
        } else {
            alert("El servidor no pudo procesar el cierre.");
        }
    } catch (error) {
        console.error("Error en handleCloseTicket:", error);
        alert("Error al cerrar: " + error.message);
    }
};
document.addEventListener('click', (e) => {
    const target = e.target;

    // 1. Abrir Popup de Filtro General
    if (target.id === 'filter-button' || target.closest('#filter-button')) {
        filterPopupDiv?.classList.toggle('hidden');
        return;
    }

    // 2. Abrir Popup de Cierre dentro de una Card (Ticket)
    if (target.id === 'open-popup-btn') {
        // Ocultar otros popups abiertos de otras cards
        document.querySelectorAll('[id^="popup-div-"]').forEach(p => {
            if (p.id !== 'popup-div') p.classList.add('hidden');
        });

        const card = target.closest('.claim-card');
        if (card) {
            const popup = card.querySelector(`#popup-div-${card.id}`);
            popup?.classList.toggle('hidden');
        }
        return;
    }

    // 3. Botón de enviar cierre de ticket
    if (target.classList.contains('close-ticket-trigger')) {
        handleCloseTicket(e);
        return;
    }

    // 4. Cerrar popups si se hace clic afuera
    if (filterPopupDiv && !filterPopupDiv.classList.contains('hidden') && !target.closest('#popup-div')) {
        filterPopupDiv.classList.add('hidden');
    }
});

const handleSearch = (event) => {
    clearTimeout(searchTimeout);
    const searchTerm = event.target.value.trim();

    searchTimeout = setTimeout(async () => {
        const results = (searchTerm === '') 
            ? await addclaimsByState('open') 
            : await searchClaims(searchTerm, CURRENT_CLAIM_STATE);
        displayClaims(results);
    }, 300);
};

const handleApplyFilters = async () => {
    const filters = {
        state: CURRENT_CLAIM_STATE,
        time: timeSelect?.value,
        dateFrom: dateFromInput?.value,
        dateTo: dateToInput?.value,
        type: typeSelect?.value,
        severity: severitySelect?.value,
        recurrence: recurrenceSelect?.value,
        service: serviceSelect?.value,
    };
    filterPopupDiv?.classList.add('hidden');
    const claims = await filterClaims(filters);
    displayClaims(claims);
};

document.addEventListener('change', (e) => {
    if (e.target.id === 'time-select') {
        const popupDate = document.getElementById('popup-div-date');
        
        if (!popupDate) return;

        if (e.target.value === 'P') {
            popupDate.classList.remove('hidden');
            popupDate.style.display = 'block'; 
        } else {
            popupDate.classList.add('hidden');
            popupDate.style.display = 'none';
        }
    }
});


openBtn?.addEventListener('click', () => toggleModal(true));
closeBtn?.addEventListener('click', () => toggleModal(false));
cancelBtn?.addEventListener('click', () => toggleModal(false));
applyFiltersButton?.addEventListener('click', handleApplyFilters);
searchInput?.addEventListener('input', handleSearch);

document.addEventListener('DOMContentLoaded', async () => {
    renderNavbar();
    await loadDatalist();
    
    const storedSearchTerm = localStorage.getItem('clientSearchTerm');
    if (storedSearchTerm && searchInput) {
        searchInput.value = storedSearchTerm;
        const claims = await searchClaims(storedSearchTerm, CURRENT_CLAIM_STATE);
        displayClaims(claims);
        localStorage.removeItem('clientSearchTerm');
    } else {
        await renderclaims();
    }
});