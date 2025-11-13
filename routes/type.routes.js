import { Router } from "express";
import { readFile } from 'fs/promises';
import { createType } from "../db/actions/type.actions.js";

const router = Router();



router.post('/create', async (req, res) => {
    const { name } = req.body

    try {
        const result = await createType({ name })
        res.status(200).json(result)
    } catch (error) {
        res.status(400).json({ status: false })
    }

})

export default router