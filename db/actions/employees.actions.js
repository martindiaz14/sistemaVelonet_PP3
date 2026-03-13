import { connectToDatabase } from "../connection.js"
import employees from "../schemas/employees.schema.js"


export const createEmp = async ({ name, mail, phone }) => {
    try {
        await connectToDatabase()

        const res = await employees.create({ name, mail, phone })
        return JSON.parse(JSON.stringify(res))
    } catch (error) {
        console.log(error)
    }
}
let currentTechIndex = 3;
export const getNextEmployee = async () => {
    try {
        const allTechs = await employees.find({}).sort({ _id: 1 }).select('_id');

        if (!allTechs || allTechs.length === 0) {
            throw new Error("No hay técnicos disponibles en la base de datos.");
        }

        if (currentTechIndex >= allTechs.length) {
            currentTechIndex = 0;
        }

        const selectedTechId = allTechs[currentTechIndex]._id;

        currentTechIndex = (currentTechIndex + 1) % allTechs.length;

        return selectedTechId;
    } catch (error) {
        console.error("Error al obtener el siguiente técnico:", error.message);
        throw error;
    }
};