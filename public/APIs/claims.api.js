import { API } from "./api.js"


export const addclaimsByState = async (state) => {
    try {
        const res = await fetch(`${API}/claims/${state}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        })

        if (!res.ok) {
            throw new Error(`Error: ${res.status}`)
        }

        const claims = await res.json()
        return claims
    } catch (error) {
        console.error(error)
    }
}

/**
 * @param {string} id
 * @param {object} updateData 
 * @returns {object|null} 
 */
export const closeClaim = async (id, updateData) => {
    try {

        const res = await fetch(`${API}/claims/close/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },

            body: JSON.stringify(updateData)
        });

        if (!res.ok) {
            const errorBody = await res.json();
            throw new Error(`Error ${res.status}: ${errorBody.message || 'Error desconocido'}`);
        }

        const result = await res.json();
        return result;
    } catch (error) {
        console.error("Fallo al enviar solicitud de cierre:", error);
        return null;
    }
}

/**
 * @param {string} searchTerm 
 * @param {number} claimState
 * @returns {Array<object>}
 */
export const searchClaims = async (searchTerm, claimState) => {
    try {
        const url = `${API}/claims/search?q=${encodeURIComponent(searchTerm)}&state=${claimState}`;

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

        const claims = await res.json()
        return claims
    } catch (error) {
        console.error("Fallo al buscar reclamos:", error.message);
        throw error;
    }
}


export const filterClaims = async (filters) => {
    try {
        const params = new URLSearchParams();

        params.append('state', filters.state);
        const isValid = (val) => val && val !== '...' && val !== '' && val !== 'all';

        if (isValid(filters.time)) params.append('time', filters.time);
        if (isValid(filters.type)) params.append('type', filters.type);
        if (isValid(filters.severity)) params.append('severity', filters.severity);
        if (isValid(filters.recurrence)) params.append('recurrence', filters.recurrence);
        if (isValid(filters.service)) params.append('service', filters.service); // <--- Corregido

        if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.append('dateTo', filters.dateTo);

        const url = `${API}/claims/filter?${params.toString()}`;
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!res.ok) {
            const errorBody = await res.json();
            throw new Error(`Error ${res.status}: ${errorBody.message || 'Error desconocido'}`);
        }

        return await res.json();

    } catch (error) {
        console.error("Fallo al aplicar filtros:", error);
        throw error;
    }
}

/**
 * @param {object} reportOptions 
 * @returns {object} 
 */
export const generatePredefinedReport = async (reportOptions) => {
    try {
        const url = `${API}/claims/reports`;

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(reportOptions)
        });

        if (!res.ok) {
            const errorBody = await res.json();
            throw new Error(`Error ${res.status}: ${errorBody.message || 'Error al generar el reporte en el servidor'}`);
        }

        const result = await res.json();
        return result.data;

    } catch (error) {
        console.error("Fallo al solicitar la generación del reporte:", error);
        throw error;
    }
}