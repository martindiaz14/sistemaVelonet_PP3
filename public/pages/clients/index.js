import { navbar } from "../../general-components/nav.js";
import { addclients, searchClients } from "../../APIs/clients.api.js";
import {clientscard} from "./components/clientscard.js"


const searchInput = document.getElementById('searchInput');
const container = document.getElementById("container");
let searchTimeout;

const renderNavbar = () => {
    const navbarContainer = document.getElementById('header');
    navbarContainer.innerHTML = navbar();
};

document.addEventListener('DOMContentLoaded', renderNavbar)


const renderclients = async () => {

    const clients = await addclients()
    const container = document.getElementById("container")

    let clientscon = ``
    container.innerHTML = clientscon

    clients.forEach(e => {
        clientscon += clientscard(e)
    });
    container.innerHTML = clientscon
}

document.addEventListener('DOMContentLoaded', async()=>{

  await renderclients()
})


/**
 * @param {Array} clients 
 */
const displayClients = (clients) => {
    let clientscon = ``;
    
    if (!clients || clients.length === 0) {
        clientscon = `<div class="p-6 text-center text-gray-700 bg-gray-100 rounded-lg shadow-inner mt-4">No se encontraron clientes que coincidan con la búsqueda.</div>`;
    } else {
        clients.forEach(e => {
            clientscon += clientscard(e);
        });
    }
    
    container.innerHTML = clientscon;
};


const loadAllClients = async () => {
    const clients = await addclients();
    displayClients(clients);
}

const handleClientSearch = () => {
    clearTimeout(searchTimeout);

    const searchTerm = searchInput.value.trim();

    if (searchTerm.length === 0) {
        loadAllClients();
        return;
    }

    searchTimeout = setTimeout(async () => {
        try {
            const results = await searchClients(searchTerm);
            
            displayClients(results);
        } catch (error) {
            console.error("Error al buscar clientes:", error);
            displayClients([]); 
        }
    }, 300);
};

document.addEventListener('DOMContentLoaded', async () => {
    if (searchInput) {
        searchInput.addEventListener('input', handleClientSearch);
    }
    
    await loadAllClients();
});
