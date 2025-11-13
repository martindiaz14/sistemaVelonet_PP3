import { connectToDatabase } from "../connection.js"
import type from "../schemas/type.schema.js"


export const createType = async({name})=>{
    try {
        await connectToDatabase()
    
        const res = await type.create({name})
        return JSON.parse(JSON.stringify(res))
    } catch (error) {
        console.log(error)
    }}