import { connectToDatabase } from "../connection.js"
import claims from "../schemas/claims.schema.js"
import clients from "../schemas/clients.schema.js";
import types from "../schemas/type.schema.js";
import recurrence from "../schemas/recurrence.schema.js";
import employee from "../schemas/employees.schema.js";
import severity from "../schemas/severity.schema.js"
import service from "../schemas/service.schema.js";
import bcrypt from 'bcryptjs';
import mongoose from "mongoose";

export const createClaims = async ({ IdClient, IdEmployee, date, claimNumber, desc, state, Idrecurrence, Idseverety, dateResolution, descTec, resolutionTime, Idservice }) => {
    try {
        await connectToDatabase()

        const res = await claims.create({ IdClient, IdEmployee, date, claimNumber, desc, state, Idrecurrence, Idseverety, dateResolution, descTec, resolutionTime })
        return JSON.parse(JSON.stringify(res))
    } catch (error) {
        console.log(error)
    }
}

const getIdsByName = async (model, names) => {
    if (!names || names.length === 0) return [];

    const nameArray = Array.isArray(names) ? names : [names];

    const documents = await model.find({ name: { $in: nameArray.map(n => new RegExp(n, 'i')) } }).select('_id');
    return documents.map(doc => doc._id);
};

const calculateResolutionTime = (startDate, endDate) => {

    const diffMs = endDate.getTime() - startDate.getTime();

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHoursTotal = Math.floor(diffMs / (1000 * 60 * 60));
    const remainingHours = diffHoursTotal % 24;
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    let output = "";
    if (diffDays > 0) {
        output += `${diffDays} día${diffDays > 1 ? 's' : ''}, `;
    }
    output += `${remainingHours} hora${remainingHours !== 1 ? 's' : ''}`;


    return output.trim();
};

/**
 * @param {number} claimState
 */
export const claimsByState = async (claimState) => {
    try {
        await connectToDatabase();

        const claimsData = await claims.find({ state: claimState })
            .populate({
                path: 'IdClient',
                select: 'name address phone dni IdType count_calls profilePictureUrl',
                populate: {
                    path: 'IdType',
                    select: 'name'
                }
            })
            .populate({
                path: 'Idrecurrence',
                select: 'name'
            })
            .populate({
                path: 'Idseverity',
                select: 'name'
            })
            .populate({
                path: 'IdService',
                select: 'name'
            })
            .populate('IdEmployee', 'name')
            .sort({ date: -1 })
            .exec();
        const formattedClaims = claimsData.map(claim => {

            let plainClaim = claim.toObject ? claim.toObject() : claim;

            const dateOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
            const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };

            const formatDateTime = (dateField) => {
                if (dateField) {
                    const date = new Date(dateField);
                    const formattedDate = date.toLocaleDateString('es-ES', dateOptions);
                    const formattedTime = date.toLocaleTimeString('es-ES', timeOptions);
                    return `${formattedDate} ${formattedTime}`;
                }
                return 'N/A';
            };

            plainClaim.date = formatDateTime(plainClaim.date);
            plainClaim.dateResolution = formatDateTime(plainClaim.dateResolution);

            return plainClaim;
        });
        return JSON.parse(JSON.stringify(formattedClaims));

    } catch (error) {
        console.error(`Error al obtener reclamos con estado ${claimState}:`, error);
        return [];
    }
}

/**
 * @param {string} claimId
 * @param {object} updateData
 */
export const closeClaim = async (claimId, updateData) => {
    try {
        await connectToDatabase();

        const existingClaim = await claims.findById(claimId).select('date');

        if (!existingClaim || !existingClaim.date) {
            console.error(`Reclamo ${claimId} no encontrado o sin fecha de inicio.`);
            return null;
        }

        const dateResolution = new Date();

        const resolutionTimeStr = calculateResolutionTime(existingClaim.date, dateResolution);

        const severityDocument = await severity.findOne({ name: updateData.severityLabel });

        if (!severityDocument) {
            const error = new Error("Gravedad no válida o modelo 'severity' no cargado.");
            error.status = 400;
            throw error;
        }

        const updateFields = {
            state: 2,
            descTec: updateData.descTec,
            Idseverity: severityDocument._id,
            dateResolution: dateResolution,
            resolutionTime: resolutionTimeStr,
        };

        const updatedClaim = await claims.findByIdAndUpdate(
            claimId,
            { $set: updateFields },
            { new: true }
        );

        if (!updatedClaim) return null;

        return JSON.parse(JSON.stringify(updatedClaim));

    } catch (error) {
        console.error("❌ Fallo crítico en closeClaim:", error.message);
        throw error;
    }
};

/**
 * @param {string} searchTerm 
 * @param {number} claimState 
 * @returns {Array<object>}
 */
export const searchClaims = async (searchTerm, claimState) => {
    try {
        await connectToDatabase();

        const trimmedTerm = searchTerm.trim();
        const escapedSearchTerm = trimmedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const isNumeric = /^\d+$/.test(trimmedTerm);

        let clientQuery = {};
        let claimQuery = {};
        let clientIds = [];
        let clientsFoundByDni = [];

        if (trimmedTerm.length === 0) {
            console.log("ℹ️ Busqueda vacía. Trayendo todos los reclamos con state = 2.");
            const stateQuery = { state: claimState };

            const claimsData = await claims.find(stateQuery)
                .populate({
                    path: 'IdClient',
                    select: 'name address phone dni IdType count_calls',
                    populate: {
                        path: 'IdType',
                        select: 'name'
                    }
                })
                .populate({ path: 'Idrecurrence', select: 'name' })
                .populate({ path: 'Idseverity', select: 'name' })
                .populate({ path: 'IdService', select: 'name' })
                .populate('IdEmployee', 'name')
                .sort({ date: -1 })
                .exec();

            const dateOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
            const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };

            const formatDateTime = (dateField) => {
                if (dateField) {
                    const date = new Date(dateField);
                    const formattedDate = date.toLocaleDateString('es-ES', dateOptions);
                    const formattedTime = date.toLocaleTimeString('es-ES', timeOptions);
                    return `${formattedDate} ${formattedTime}`;
                }
                return 'N/A';
            };

            const formattedClaims = claimsData.map(claim => {
                let plainClaim = claim.toObject ? claim.toObject() : claim;
                plainClaim.date = formatDateTime(plainClaim.date);
                plainClaim.dateResolution = formatDateTime(plainClaim.dateResolution);
                return plainClaim;
            });

            return JSON.parse(JSON.stringify(formattedClaims));
        }

        clientQuery = { name: { $regex: new RegExp(escapedSearchTerm, 'i') } };


        if (isNumeric) {
            console.warn("⚠️ Búsqueda por DNI: Realizando comparación lenta con bcrypt para encontrar el cliente.");

            const clientsByName = await clients.find(clientQuery).select('_id name dni');

            const allClientsWithDni = await clients.find({}).select('_id dni');

            for (const client of allClientsWithDni) {
                const match = await bcrypt.compare(trimmedTerm, client.dni);
                if (match) {
                    clientsFoundByDni.push(client);
                }
            }

            const uniqueClientIds = new Set(clientsByName.map(c => c._id.toString()));

            for (const dniClient of clientsFoundByDni) {
                uniqueClientIds.add(dniClient._id.toString());
            }

            clientIds = Array.from(uniqueClientIds).map(id => new mongoose.Types.ObjectId(id));

            const numericClaimNumber = parseInt(trimmedTerm, 10);
            claimQuery = { claimNumber: numericClaimNumber };

        } else {
            clientIds = await clients.find(clientQuery).select('_id');
            clientIds = clientIds.map(client => client._id);
        }

        const queryConditions = [];

        if (clientIds.length > 0) {
            queryConditions.push({ IdClient: { $in: clientIds } });
        }

        if (isNumeric) {
            queryConditions.push(claimQuery);
        }

        if (queryConditions.length === 0) {
            return [];
        }

        const stateCondition = { state: claimState };

        const query = { $and: [stateCondition, { $or: queryConditions }] };

        const claimsData = await claims.find(query)
            .populate({
                path: 'IdClient',
                select: 'name address phone dni IdType count_calls profilePictureUrl',
                populate: {
                    path: 'IdType',
                    select: 'name'
                }
            })
            .populate({ path: 'Idrecurrence', select: 'name' })
            .populate({ path: 'Idseverity', select: 'name' })
            .populate('IdEmployee', 'name')
            .sort({ date: -1 })
            .exec();

        const dateOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
        const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };

        const formatDateTime = (dateField) => {
            if (dateField) {
                const date = new Date(dateField);
                const formattedDate = date.toLocaleDateString('es-ES', dateOptions);
                const formattedTime = date.toLocaleTimeString('es-ES', timeOptions);
                return `${formattedDate} ${formattedTime}`;
            }
            return 'N/A';
        };

        const formattedClaims = claimsData.map(claim => {
            let plainClaim = claim.toObject ? claim.toObject() : claim;
            plainClaim.date = formatDateTime(plainClaim.date);
            plainClaim.dateResolution = formatDateTime(plainClaim.dateResolution);
            return plainClaim;
        });

        return JSON.parse(JSON.stringify(formattedClaims));

    } catch (error) {
        console.error("❌ Error en searchClaims:", error);
        throw new Error(`Error en la búsqueda: 500 - Error interno del servidor durante la búsqueda.`);
    }
};

/**
 * @param {object} filters
 * @returns {Array<object>} 
 */
export const filterClaims = async (filters) => {
    try {
        await connectToDatabase();

        const baseQuery = { state: filters.state };
        const andConditions = [baseQuery];

        const dateFilter = {};
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        if (!filters.dateFrom && !filters.dateTo) {
            if (filters.time === 'Dia') dateFilter.$gte = now;
            else if (filters.time === 'Semana') {
                const oneWeekAgo = new Date(now);
                oneWeekAgo.setDate(now.getDate() - 7);
                dateFilter.$gte = oneWeekAgo;
            } else if (filters.time === 'Mes') {
                const oneMonthAgo = new Date(now);
                oneMonthAgo.setMonth(now.getMonth() - 1);
                dateFilter.$gte = oneMonthAgo;
            } else if (filters.time === 'Año') {
                const oneYearAgo = new Date(now);
                oneYearAgo.setFullYear(now.getFullYear() - 1);
                dateFilter.$gte = oneYearAgo;
            }
        }

        if (filters.dateFrom) {
            dateFilter.$gte = new Date(filters.dateFrom);
            dateFilter.$gte.setHours(0, 0, 0, 0);
        }
        if (filters.dateTo) {
            dateFilter.$lte = new Date(filters.dateTo);
            dateFilter.$lte.setHours(23, 59, 59, 999);
        }
        if (Object.keys(dateFilter).length > 0) {
            andConditions.push({ date: dateFilter });
        }


        const applyFilter = async (model, fieldName, value) => {
            if (!value || value === '...') return;

            if (mongoose.Types.ObjectId.isValid(value)) {
                andConditions.push({ [fieldName]: value });
            } else {

                const ids = await getIdsByName(model, value);
                if (ids.length > 0) {
                    andConditions.push({ [fieldName]: { $in: ids } });
                }
            }
        };


        if (filters.type && filters.type !== '...') {
            let typeIds = [];
            if (mongoose.Types.ObjectId.isValid(filters.type)) {
                typeIds = [filters.type];
            } else {
                typeIds = await getIdsByName(types, filters.type);
            }

            if (typeIds.length > 0) {
                const clientIds = await clients.find({ IdType: { $in: typeIds } }).select('_id');
                if (clientIds.length > 0) {
                    andConditions.push({ IdClient: { $in: clientIds } });
                }
            }
        }

        await applyFilter(severity, 'Idseverity', filters.severity);


        await applyFilter(recurrence, 'Idrecurrence', filters.recurrence);

        await applyFilter(service, 'IdService', filters.service);



        const finalQuery = { $and: andConditions };


        const claimsData = await claims.find(finalQuery)
            .populate({
                path: 'IdClient',
                select: 'name address phone dni IdType count_calls profilePictureUrl',
                populate: { path: 'IdType', select: 'name' }
            })
            .populate('Idrecurrence', 'name')
            .populate('Idseverity', 'name')
            .populate('IdEmployee', 'name')
            .populate('IdService', 'name')
            .sort({ date: -1 })
            .exec();


        const formattedClaims = claimsData.map(claim => {
            let plainClaim = claim.toObject ? claim.toObject() : claim;
            const formatDateTime = (dateField) => {
                if (!dateField) return 'N/A';
                const date = new Date(dateField);
                return `${date.toLocaleDateString('es-ES')} ${date.toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit', hour12:false})}`;
            };
            plainClaim.date = formatDateTime(plainClaim.date);
            plainClaim.dateResolution = formatDateTime(plainClaim.dateResolution);
            return plainClaim;
        });

        return JSON.parse(JSON.stringify(formattedClaims));

    } catch (error) {
        console.error("❌ Error en filterClaims:", error);
        throw error;
    }
};