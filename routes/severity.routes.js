import { Router } from "express";
import {readFile} from 'fs/promises';
import { createSev } from "../db/actions/severity.actions.js";

const router = Router();



router.post('/create' , async(req, res)=>{
    const {name} = req.body
    
    try {
        const result = await createSev({name})
        res.status(200).json(result)
    } catch (error) {
        res.status(400).json({status:false})
    }
    
    })

    export default router