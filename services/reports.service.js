import mongoose from "mongoose";
import Claims from "../db/schemas/claims.schema.js";
import Recurrence from "../db/schemas/recurrence.schema.js";
import Type from "../db/schemas/type.schema.js";
import Severity from "../db/schemas/severity.schema.js";

const { ObjectId } = mongoose.Types;

// ====================================================================
// VARIABLES GLOBALES DE MAPEO (Asumimos que se llenan al iniciar la app)
// ====================================================================
let RECURRENCE_OPTIONS = {};
let SEVERITY_OPTIONS = {}
let CLAIM_TYPE_OPTIONS = {}
// ====================================================================

export async function loadClaimTypeOptions() {
    try {
        const claimstypes = await Type.find({});
        const options = {};
        claimstypes.forEach((type) => {
            // Mapeamos por nombre como clave, y el valor contiene el ID
            options[type.name] = { label: type.name, id: type._id.toString() };
        });
        CLAIM_TYPE_OPTIONS = options;
    } catch (error) {
        console.error("❌ Error al cargar los tipos de reclamo desde la DB:", error);
        throw new Error("No se pudieron cargar las opciones de reclamo.");
    }
}

export async function loadRecurrenceOptions() {
    try {
        const recurrences = await Recurrence.find({});
        const options = {};
        recurrences.forEach((rec) => {
            options[rec.name] = { label: rec.name, id: rec._id.toString() };
        });
        RECURRENCE_OPTIONS = options;
    } catch (error) {
        console.error("❌ Error al cargar las recurrencias desde la DB:", error);
        throw new Error("No se pudieron cargar las opciones de recurrencia.");
    }
}

export async function loadSeveritiesOptions() {
    try {
        const severities = await Severity.find({});
        const options = {};
        severities.forEach((sev) => {
            options[sev.name] = { label: sev.name, id: sev._id.toString() };
        });
        SEVERITY_OPTIONS = options;
    } catch (error) {
        console.error("❌ Error al cargar las gravedades desde la DB:", error);
        throw new Error("No se pudieron cargar las opciones de gravedad.");
    }
}

// ====================================================================
// FUNCIÓN AUXILIAR DE MAPEO (Nueva)
// ====================================================================

/**
 * Convierte el mapa de opciones (Nombre -> {id, label}) a un mapa Inverso (ID -> Nombre).
 * Esto es necesario para la proyección final de MongoDB.
 */
const buildReverseMap = (optionsMap) => {
    const reverseMap = {};
    for (const key in optionsMap) {
        if (optionsMap.hasOwnProperty(key)) {
            // Usamos el ID como clave (asegurando que es string para la comparación)
            reverseMap[optionsMap[key].id] = optionsMap[key].label;
        }
    }
    return reverseMap;
};


// ====================================================================
// FUNCIÓN PRINCIPAL DEL CONTROLADOR (Corregida)
// ====================================================================
const calculateDateRange = (period, dateFrom, dateTo) => {
    if (period === 'Todo') {
        return { start: null, end: null };
    }

    let start = dateFrom ? new Date(dateFrom) : null;
    let end = dateTo ? new Date(dateTo) : new Date(); // Hoy

    if (!start && period && period !== 'Personalizado') {
        const now = new Date();
        start = new Date(now);

        switch (period) {
            case 'Dia':
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                break;
            case 'Semana':
                start.setDate(now.getDate() - 7);
                break;
            case 'Mes':
                start.setMonth(now.getMonth() - 1);
                break;
            case 'Año':
                start.setFullYear(now.getFullYear() - 1);
                break;
        }
    }

    return { start, end };
};

// ====================================================================
// FUNCIONES AUXILIARES DE PIPELINE
// ====================================================================

const getBasePipeline = (start, end) => {
    let matchStage = {};
    if (start && end) {
        matchStage.date = { $gte: start, $lte: end };
    }

    return [
        { $match: matchStage },
        {
            $lookup: {
                from: 'clients', // Nombre de la colección de clientes
                localField: 'IdClient',
                foreignField: '_id',
                as: 'clientDetails'
            }
        },
        { $unwind: '$clientDetails' }
    ];
};

// ====================================================================
// FUNCIÓN PRINCIPAL DEL CONTROLADOR
// ====================================================================

export const generatePredefinedReport = async (req, res) => {
    let reportKey = 'UNKNOWN';
    let period, dateFrom, dateTo;
    try {
        const { reportKey, period, dateFrom, dateTo } = req.body;

        const { start, end } = calculateDateRange(period, dateFrom, dateTo);
        const pipelineBase = getBasePipeline(start, end);
        let reportData = {};


        // 3. Agregación de Tendencia (TREND)
        if (reportKey === 'DEMAND_TREND' || reportKey === 'OPERATIONAL_SUMMARY') {
            reportData.trendData = await Claims.aggregate([
                ...pipelineBase,
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                        created: { $sum: 1 },

                        resolved: { $sum: { $cond: [{ $eq: ["$state", 2] }, 1, 0] } }
                    }
                },
                { $sort: { _id: 1 } },
                { $project: { _id: 0, date: '$_id', created: 1, resolved: 1 } }
            ]);
        }

        // 4. Agregación de Riesgo (SEVERITY / RECURRENCE)
        if (reportKey === 'RISK_SEVERITY' || reportKey === 'OPERATIONAL_SUMMARY') {

            // --- CONTEO Y MAPEO DE SEVERIDAD ---
            const severityAgg = await Claims.aggregate([
                ...pipelineBase,
                { $group: { _id: '$Idseverity', count: { $sum: 1 } } },
                {
                    $lookup: { // 🚨 LOOKUP para obtener el nombre
                        from: 'severities', // Nombre de la colección en la DB
                        localField: '_id',
                        foreignField: '_id',
                        as: 'details'
                    }
                },
                { $unwind: '$details' },
                { $project: { _id: 0, name: '$details.name', count: 1 } } // Devolvemos el nombre
            ]);
            reportData.severityCounts = severityAgg;


            // --- CONTEO Y MAPEO DE RECURRENCIA ---
            const recurrenceAgg = await Claims.aggregate([
                ...pipelineBase,
                { $group: { _id: '$Idrecurrence', count: { $sum: 1 } } },
                {
                    $lookup: { // 🚨 LOOKUP para obtener el nombre
                        from: 'recurrences', // Nombre de la colección en la DB
                        localField: '_id',
                        foreignField: '_id',
                        as: 'details'
                    }
                },
                { $unwind: '$details' },
                { $project: { _id: 0, name: '$details.name', count: 1 } } // Devolvemos el nombre
            ]);
            reportData.recurrenceCounts = recurrenceAgg;
        }

        // 5. Agregación de Calificación (RATING)
        if (reportKey === 'CUSTOMER_QUALITY' || reportKey === 'OPERATIONAL_SUMMARY') {
            reportData.ratingCounts = await Claims.aggregate([
                ...pipelineBase,
                {
                    $match: {
                        'clientDetails.last_rating': { $ne: null, $gt: 0 },
                        'clientDetails._id': { $exists: true }
                    }
                },

                {
                    $group: {
                        _id: '$clientDetails._id',
                        lastRating: { $first: '$clientDetails.last_rating' }
                    }
                },

                {
                    $group: {
                        _id: '$lastRating',
                        count: { $sum: 1 }
                    }
                },

                // 3. Proyección y Ordenamiento Final
                { $project: { _id: 0, rating: '$_id', count: 1 } },
                { $sort: { rating: 1 } }
            ]);
        }

        return res.status(200).json({ success: true, data: reportData });

    } catch (error) {
        console.error(`Error crítico al generar el reporte ${reportKey}:`, error);
        return res.status(500).json({ success: false, message: "Error interno al generar el reporte." });
    }
}