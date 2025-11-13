import { Router } from "express";
import {readFile} from 'fs/promises';
import { createEmp } from "../db/actions/employees.actions.js";

const router = Router();



router.post('/create' , async(req, res)=>{
    const {name, mail, phone} = req.body
    
    try {
        const result = await createEmp({name, mail, phone})
        res.status(200).json(result)
    } catch (error) {
        res.status(400).json({status:false})
    }
    
    })

    export default router