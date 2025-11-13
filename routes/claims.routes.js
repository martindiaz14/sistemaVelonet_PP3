import { Router } from "express";
import { readFile, writeFile } from 'fs/promises';
import {claimsByState, closeClaim, searchClaims, filterClaims, createClaims} from "../db/actions/claims.actions.js";
import { generatePredefinedReport } from '../controllers/reports.controller.js';

const router = Router();

router.post('/create' , async(req, res)=>{
const {IdClient,IdEmployee, date, claimNumber,desc,state,Idrecurrence,Idseverety,dateResolution,descTec,resolutionTime} = req.body

try {
    const result = await createClaims({IdClient,IdEmployee, date, claimNumber,desc,state,Idrecurrence,Idseverety,dateResolution,descTec,resolutionTime})
    res.status(200).json(result)
} catch (error) {
    console.error("Error en la ruta de búsqueda de clientes:", error);
    res.status(400).json({status:false})
}

})

router.get('/all', async (req,res)=>{
    try {
       const result = await claimAll()
       res.status(200).json(result)
    } catch (error) {
       res.status(400).json({status:false})
    }  
   })

router.get('/filter', async (req, res) => {
    try {

        let mappedState = 1; 
        const stateQuery = req.query.state ? req.query.state.toLowerCase() : 'open';

        if (stateQuery === 'open' || stateQuery === '1') {
            mappedState = 1;
        } else if (stateQuery === 'closed' || stateQuery === '2') {
            mappedState = 2;
        } else {
             return res.status(400).json({ status: false, message: 'El parámetro state debe ser "open", "closed", 1 o 2.' });
        }

        const filters = {
            state: mappedState,
            time: req.query.time,
            type: req.query.type,
            severity: req.query.severity,
            recurrence: req.query.recurrence,
            dateFrom: req.query.dateFrom,
            dateTo: req.query.dateTo,
        };

        const result = await filterClaims(filters);

        res.status(200).json(result);
    } catch (error) {
        console.error("Error en la ruta de filtrado:", error);
        res.status(500).json({ status: false, message: 'Error interno del servidor al aplicar filtros.' });
    }
});


   
router.get('/search', async (req, res) => {
    try {
        const searchTerm = req.query.q;
        let mappedState = 1; 

        if (req.query.state) {
            const stateQuery = req.query.state.toLowerCase();
            if (stateQuery === 'open') {
                mappedState = 1;
            } else if (stateQuery === 'closed') {
                mappedState = 2;
            } else if (['1', '2'].includes(stateQuery)) {
                mappedState = parseInt(stateQuery);
            } else {
                return res.status(400).json({ status: false, message: 'El estado de búsqueda debe ser "open", "closed", 1 o 2.' });
            }
        }
        
        if (!searchTerm || searchTerm.trim() === '') {
            return res.status(400).json({ status: false, message: 'El término de búsqueda (q) es obligatorio.' });
        }
        
        const result = await searchClaims(searchTerm, mappedState);
        res.status(200).json(result);
    } catch (error) {
        console.error("Error en la ruta de búsqueda:", error);
        res.status(500).json({ status: false, message: 'Error interno del servidor durante la búsqueda.' });
    }
});


router.get('/:state', async (req, res) => { 
    try {
        const state = req.params.state; 
        let mappedState;

        if (state === 'open') {
            mappedState = 1;
        } else if (state === 'closed') {
            mappedState = 2; 
        } else {
             return res.status(400).json({ status: false, message: 'Estado de reclamo no válido. Use "open" o "closed".' });
        }

        const result = await claimsByState(mappedState);
        res.status(200).json(result);
    } catch (error) {
        console.error("Error en el manejador de rutas:", error);
        res.status(500).json({ status: false, message: 'Error interno del servidor.' });
    }  
});


router.patch('/close/:id', async (req, res) => {
    try {
        const claimId = req.params.id;
        const updateData = req.body;

        if (!updateData || !updateData.descTec || !updateData.severityLabel) {
            return res.status(400).json({ success: false, message: "Faltan datos de cierre (descripción o gravedad)." });
        }

        const result = await closeClaim(claimId, updateData);

        if (!result) {
            return res.status(404).json({ success: false, message: "Reclamo no encontrado o ya cerrado." });
        }

        res.status(200).json({ success: true, claim: result });
    } catch (error) {
        console.error(`Error al cerrar el reclamo ${req.params.id}:`, error.message);
        res.status(500).json({ success: false, message: 'Error interno al cerrar el ticket.' });
    }
});


router.post('/reports', generatePredefinedReport);

export default router