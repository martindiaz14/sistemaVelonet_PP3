import { connectToDatabase } from "../connection.js"
import clients from "../schemas/clients.schema.js"


export const createClient = async ({ img,name,dni,phone,address,count_calls,IdType,last_rating }) => {
    try {
        await connectToDatabase()

        const res = await clients.create({ img,name,dni,phone,address,count_calls,IdType,last_rating })
        return JSON.parse(JSON.stringify(res))
    } catch (error) {
        console.log(error)
    }
}



export const clientsAll = async () => {
    try {
        await connectToDatabase()

        const res = await clients.find().populate({
            path: 'IdType',
            select: 'name'
        })
        return JSON.parse(JSON.stringify(res))
    } catch (error) {
        console.log(error)
    }

}

export const searchClients = async (searchTerm) => {
    try {
        await connectToDatabase();

        const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const trimmedTerm = searchTerm.trim();

        const isNumeric = /^\d+$/.test(trimmedTerm);

        const conditions = [
            {
                name: { $regex: new RegExp(escapedSearchTerm, 'i') }
            }
        ];

        if (isNumeric) {
            conditions.push({
                dni: parseInt(trimmedTerm, 10)
            });
        }

        const query = {
            $or: conditions
        };

        const clientsData = await clients.find(query)
            .populate({
                path: 'IdType',
                select: 'name'
            })
            .select('name address phone dni IdType count_calls img')
            .exec();

        const formattedClients = clientsData.map(client => {
            return client.toObject ? client.toObject() : client;
        });

        return JSON.parse(JSON.stringify(formattedClients));

    } catch (error) {
        console.error("❌ Error en searchClients:", error);
        throw error;
    }
}
