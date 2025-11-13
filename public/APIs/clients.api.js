import { API } from "./api.js"

export const addclients = async()=>{
try{
const res = await fetch(`${API}/clients/all`,{
method: 'GET',
headers: {
    'Content-Type' : 'application/json',
}
})

if(!res.ok){
throw new Error(`Error: ${res.status}`)
}

const clients = await res.json()
return clients
}catch(error){
    console.error(error)
    }
}

export const searchClients = async (searchTerm) => {
    try {
        const url = `${API}/clients/search?q=${encodeURIComponent(searchTerm.trim())}`;
        
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        })

        if (!res.ok) {
            const errorBody = await res.json();
            throw new Error(`Error en la búsqueda: ${res.status} - ${errorBody.message || 'Error desconocido'}`);
        }

        const clients = await res.json()
        return clients
    } catch (error) {
        console.error("Fallo al buscar reclamos:", error.message);
        throw error;
    }
}