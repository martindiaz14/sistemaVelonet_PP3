import { Router } from "express";
import {readFile} from 'fs/promises';
import { clientsAll, searchClients,createClient } from "../db/actions/clients.actions.js";



const router = Router();

router.get('/all', async (req,res)=>{
 try {
    const result = await clientsAll()
    res.status(200).json(result)
 } catch (error) {
    res.status(400).json({status:false})
 }  
})

router.get('/search', async (req, res) => {
    try {
        const searchTerm = req.query.q;

        if (!searchTerm || searchTerm.trim() === '') {
            return res.status(400).json({ status: false, message: 'El parámetro de búsqueda "q" es obligatorio.' });
        }

        const result = await searchClients(searchTerm);
        
        res.status(200).json(result);
    } catch (error) {
        console.error("Error en la ruta de búsqueda de clientes:", error);
        res.status(500).json({ status: false, message: 'Error interno del servidor al buscar clientes.' });
    }
});


router.post('/create' , async(req, res)=>{
const {img,name,dni,phone,address,count_calls ,IdType,last_rating} = req.body

try {
    const result = await createClient({img,name,dni,phone,address,count_calls,IdType ,last_rating})
    res.status(200).json(result)
} catch (error) {
    console.error("Error en la ruta de búsqueda de clientes:", error);
    res.status(400).json({status:false})
}

})




export default router