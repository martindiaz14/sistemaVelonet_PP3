import mongoose from "mongoose";
import Claims from "../db/schemas/claims.schema.js";
import Recurrence from "../db/schemas/recurrence.schema.js";
import Type from "../db/schemas/type.schema.js";
import Severity from "../db/schemas/severity.schema.js";



const calculateDateRange = (period, dateFrom, dateTo) => {
    if (period === 'Todo') {
        return { start: null, end: null };
    }

    let start = dateFrom ? new Date(dateFrom) : null;
    let end = dateTo ? new Date(dateTo) : new Date();

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

const getBasePipeline = (start, end) => {
    let matchStage = {};
    if (start && end) {
        matchStage.date = { $gte: start, $lte: end };
    }

    return [
        { $match: matchStage },
        {
            $lookup: {
                from: 'clients',
                localField: 'IdClient',
                foreignField: '_id',
                as: 'clientDetails'
            }
        },
        { $unwind: '$clientDetails' }
    ];
};


export const generatePredefinedReport = async (req, res) => {
    try {
        const { reportKey, period, dateFrom, dateTo } = req.body;

        const { start, end } = calculateDateRange(period, dateFrom, dateTo);
        const pipelineBase = getBasePipeline(start, end);
        let reportData = {};

        if (reportKey === 'TENDENCIA_Y_DEMANDA') {
            reportData.trendData = await Claims.aggregate([
                ...pipelineBase,
                {
                    $project: {
                        events: [
                            { dateEvent: "$date", type: "created" },
                            {
                                dateEvent: {
                                    $cond: [
                                        { $and: [{ $eq: ["$state", 2] }, { $ne: ["$dateResolution", null] }] },
                                        "$dateResolution",
                                        null
                                    ]
                                },
                                type: "resolved"
                            }
                        ]
                    }
                },
                { $unwind: "$events" },
                { $match: { "events.dateEvent": { $ne: null } } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$events.dateEvent" } },
                        created: { $sum: { $cond: [{ $eq: ["$events.type", "created"] }, 1, 0] } },
                        resolved: { $sum: { $cond: [{ $eq: ["$events.type", "resolved"] }, 1, 0] } }
                    }
                },

                { $sort: { _id: 1 } },
                {
                    $project: {
                        _id: 0,

                        date: { $substr: ["$_id", 5, 5] },
                        created: 1,
                        resolved: 1
                    }
                }
            ]);
        }

        // 2. RIESGO Y CALIDAD
        if (reportKey === 'RIESGO_Y_CALIDAD') {
            const severityAgg = await Claims.aggregate([
                ...pipelineBase,
                { $group: { _id: '$Idseverity', count: { $sum: 1 } } },
                {
                    $lookup: {
                        from: 'severities',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'details'
                    }
                },
                { $unwind: '$details' },
                { $project: { _id: 0, name: '$details.name', count: 1 } }
            ]);
            reportData.severityCounts = severityAgg;

            const recurrenceAgg = await Claims.aggregate([
                ...pipelineBase,
                { $group: { _id: '$Idrecurrence', count: { $sum: 1 } } },
                {
                    $lookup: {
                        from: 'recurrences',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'details'
                    }
                },
                { $unwind: '$details' },
                { $project: { _id: 0, name: '$details.name', count: 1 } }
            ]);
            reportData.recurrenceCounts = recurrenceAgg;
        }

        // 3. SATISFACCIÓN DEL CLIENTE
        if (reportKey === 'SATIFACCION_DEL_CLIENTE') {
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
                { $project: { _id: 0, rating: '$_id', count: 1 } },
                { $sort: { rating: 1 } }
            ]);
        }

        if (reportKey === 'DISTRIBUCION_POR_TIPO') {
            reportData.typeCounts = await Claims.aggregate([
                ...pipelineBase,
                { $group: { _id: '$IdService', count: { $sum: 1 } } },
                {
                    $lookup: {
                        from: 'services',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'details'
                    }
                },
                { $unwind: '$details' },
                { $project: { _id: 0, name: '$details.name', count: 1 } },
                { $sort: { count: -1 } }
            ]);
        }

        if (reportKey === 'ESTADO_ACTUAL') {
            reportData.stateDistribution = await Claims.aggregate([
                ...pipelineBase,
                { $group: { _id: '$state', count: { $sum: 1 } } },
                { $project: { _id: 0, state: '$_id', count: 1 } },
                { $sort: { state: 1 } }
            ]);
        }


        if (reportKey === 'TOP_CLIENTES') {
            reportData.topClients = await Claims.aggregate([
                ...pipelineBase,
                {
                    $group: {
                        _id: '$clientDetails._id',
                        clientName: { $first: '$clientDetails.name' }, 
                        totalClaims: { $sum: 1 }
                    }
                },
                { $sort: { totalClaims: -1 } },
                { $limit: 10 },
                { $project: { _id: 0, clientName: 1, totalClaims: 1 } }
            ]);
        }

        if (reportKey === 'TIEMPO_RESOLUCION') {
            reportData.resolutionTime = await Claims.aggregate([
                ...pipelineBase,
                { $match: { state: 2, dateResolution: { $exists: true, $ne: null } } },
                {
                    $project: {
                        resolutionTimeHours: {
                            $divide: [
                                { $subtract: ["$dateResolution", "$date"] },
                                1000 * 60 * 60
                            ]
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        avgResolutionTimeHours: { $avg: "$resolutionTimeHours" },
                        minResolutionTime: { $min: "$resolutionTimeHours" },
                        maxResolutionTime: { $max: "$resolutionTimeHours" }
                    }
                },
                { $project: { _id: 0 } }
            ]);
        }

        return res.status(200).json({ success: true, data: reportData });

    } catch (error) {
        const keyAttempted = req && req.body && req.body.reportKey ? req.body.reportKey : 'DESCONOCIDA';
        console.error(`Error crítico al generar el reporte ${keyAttempted}:`, error);
        return res.status(500).json({ success: false, message: "Error interno al generar el reporte." });
    }
}