import { connectToDatabase } from "../connection.js"
import severety from "../schemas/severity.schema.js"


export const createSev = async({name})=>{
    try {
        await connectToDatabase()
    
        const res = await severety.create({name})
        return JSON.parse(JSON.stringify(res))
    } catch (error) {
        console.log(error)
    }}