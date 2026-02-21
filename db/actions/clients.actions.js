import { connectToDatabase } from "../connection.js"
import clients from "../schemas/clients.schema.js"
import bcrypt from 'bcryptjs';


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
  

        const trimmedTerm = searchTerm.trim();
        const isNumeric = /^\d+$/.test(trimmedTerm);

        const conditions = [];

        const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        conditions.push({
            name: { $regex: new RegExp(escapedSearchTerm, 'i') }
        });

        const query = { $or: conditions };

        let clientsData = await clients.find(query)
            .populate({
                path: 'IdType',
                select: 'name'
            })
            .select('name address phone dni IdType count_calls last_rating')
            .exec();
            
        if (isNumeric) {
            
            const dniSearchResults = [];
            

            const allClients = await clients.find({}) 
                                           .select('name dni IdType count_calls address phone last_rating');
            
            for (const client of allClients) {

                const match = await bcrypt.compare(trimmedTerm, client.dni);
                
                if (match) {

                    dniSearchResults.push(client);
                }
            }


            const uniqueClientIds = new Set(clientsData.map(c => c._id.toString()));
            
            for (const dniClient of dniSearchResults) {
                if (!uniqueClientIds.has(dniClient._id.toString())) {
                    clientsData.push(dniClient);
                }
            }
        }


        const formattedClients = clientsData.map(client => {
            return client.toObject ? client.toObject() : client;
        });


        return JSON.parse(JSON.stringify(formattedClients));

    } catch (error) {
        console.error("❌ Error en searchClients:", error);
        throw error;
    }
}