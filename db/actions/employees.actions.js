import { connectToDatabase } from "../connection.js"
import employees from "../schemas/employees.schema.js"


export const createEmp = async({name, mail, phone})=>{
    try {
        await connectToDatabase()
    
        const res = await employees.create({name, mail, phone})
        return JSON.parse(JSON.stringify(res))
    } catch (error) {
        console.log(error)
    }}