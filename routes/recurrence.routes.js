import { Router } from "express";
import {readFile} from 'fs/promises';
import { createRec } from "../db/actions/recurrence.actions.js";

const router = Router();



router.post('/create' , async(req, res)=>{
    const {name} = req.body
    
    try {
        const result = await createRec({name})
        res.status(200).json(result)
    } catch (error) {
        res.status(400).json({status:false})
    }
    
    })

    export default router