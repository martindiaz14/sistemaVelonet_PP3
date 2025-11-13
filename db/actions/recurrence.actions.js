import { connectToDatabase } from "../connection.js"
import recurrence from "../schemas/recurrence.schema.js"


export const createRec = async({name})=>{
    try {
        await connectToDatabase()
    
        const res = await recurrence.create({name})
        return JSON.parse(JSON.stringify(res))
    } catch (error) {
        console.log(error)
    }}