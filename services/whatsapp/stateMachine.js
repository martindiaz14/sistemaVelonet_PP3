import clients from "../../db/schemas/clients.schema.js";
import claims from "../../db/schemas/claims.schema.js";
import service from "../../db/schemas/service.schema.js";
import { selectRandomEmployeeId, CLAIM_TYPE_OPTIONS, RECURRENCE_OPTIONS, SERVICES_OPTIONS } from "./dbLoaders.js";
import bcrypt from 'bcryptjs';
import { OFFENSIVE_KEYWORDS, BLOCK_DURATION_MS } from "./botConfig.js";
import mongoose from "mongoose";
import LogModel from "../../db/schemas/controllers/conversationLog.schema.js";
import BlockedUser from "../../db/schemas/controllers/BlockedUser.schema.js";
import { sendSingleClaimNotification } from "../gmail.service.js";

const TIME_THRESHOLD_MS = 10000;
const STATE_EXPIRATION_HOURS = 24;
const estadosConversacion = {};
const MAX_MESSAGES_PER_SESSION = 25;

function detectOffensiveLanguage(text) {
    const normalizedText = text.toLowerCase().replace(/[^\w\s]/gi, '');
    return OFFENSIVE_KEYWORDS.some(keyword => normalizedText.includes(keyword));
}

async function logConversation(phone, direction, content, state) {
    try {
        const messageEntry = {
            direction: direction,
            content: content.substring(0, 500),
            state: state,
        };

        const existingSession = await LogModel.findOne({ phone: phone }).select('messages');

        if (existingSession) {
            let updateOperation = {};
            if (existingSession.messages.length >= MAX_MESSAGES_PER_SESSION) {
                updateOperation = {
                    $set: {
                        messages: [messageEntry],
                        lastActivity: new Date(),
                        status: 'ROTATED'
                    }
                };
            } else {
                updateOperation = {
                    $push: { messages: messageEntry },
                    $set: { lastActivity: new Date(), status: 'ACTIVE' }
                };
            }
            await LogModel.updateOne({ phone: phone }, updateOperation);
        } else {
            await LogModel.create({
                phone: phone,
                messages: [messageEntry],
                lastActivity: new Date(),
                status: 'ACTIVE'
            });
        }
    } catch (error) {
        console.error("❌ Fallo al guardar el log de conversación:", error);
    }
}

export async function messageHandler(sock, msg) {
    let phoneKey = 'UNKNOWN';
    let remoteJid = 'UNKNOWN_JID';

    try {
        const m = msg.messages[0];
        remoteJid = m.key.remoteJid;

        if (!m.message || remoteJid.endsWith('@g.us') || remoteJid === 'status@broadcast' || m.key.fromMe || m.key.participant) return;

        const messageType = Object.keys(m.message)[0];
        const allowedTypes = ['conversation', 'extendedTextMessage'];
        if (!allowedTypes.includes(messageType)) return;

        const conversationKey = remoteJid;
        const fromRaw = remoteJid.split("@")[0];
        phoneKey = fromRaw.replace(/\D/g, '');

        if (phoneKey.length < 5) return;

        const messageTimestampMs = m.messageTimestamp * 1000;
        const nowMs = Date.now();
        if ((nowMs - messageTimestampMs) / 1000 > TIME_THRESHOLD_MS / 1000) return;

        const texto = m.message.conversation?.trim() || m.message.extendedTextMessage?.text?.trim() || "";

        // Verificación de Bloqueo
        try {
            const existingBlock = await BlockedUser.findOne({ phone: phoneKey });
            if (existingBlock) {
                if (existingBlock.unblockDate > new Date()) {
                    const remainingTime = Math.ceil((existingBlock.unblockDate - new Date()) / (1000 * 60 * 60 * 24));
                    const responseText = `🔒 Tu número ha sido bloqueado. Te quedan ${remainingTime} días de suspensión.`;
                    await sock.sendMessage(remoteJid, { text: responseText });
                    return;
                } else {
                    await BlockedUser.deleteOne({ phone: phoneKey });
                }
            }
        } catch (error) { console.error(error); }

        if (detectOffensiveLanguage(texto)) {
            const unblockDate = new Date(Date.now() + BLOCK_DURATION_MS);
            await new BlockedUser({ phone: phoneKey, unblockDate, reason: 'Lenguaje detectado por IA' }).save();
            const responseText = `⚠️ Advertencia: Se detectó lenguaje ofensivo. Bloqueado por 7 días.`;
            await sock.sendMessage(remoteJid, { text: responseText });
            return;
        }

        const textoNormalizado = texto.toLowerCase();
        const nombre = m.pushName || "Cliente";
        let cliente = await clients.findOne({ phone: phoneKey });

        // --- FLUJO INICIAL ---
        if (!estadosConversacion[conversationKey]) {
            if (!cliente) {
                estadosConversacion[conversationKey] = {
                    paso: "esperandoDni",
                    datosCliente: { name: nombre, phone: phoneKey, count_calls: 0 },
                    datosReclamo: {},
                    lastActivity: new Date()
                };
                let responseText = `Hola ${nombre}! 👋 Soy tu asistente de reclamos. Para comenzar, por favor, indícanos tu *DNI*.`;
                await sock.sendMessage(remoteJid, { text: responseText });
                await logConversation(phoneKey, 'OUTBOUND', responseText, 'esperandoDni');
                return;
            }

            cliente.count_calls = (cliente.count_calls || 0) + 1;
            await cliente.save();

            estadosConversacion[conversationKey] = {
                paso: "esperandoServicio",
                datosCliente: cliente,
                datosReclamo: {},
                lastActivity: new Date()
            };

            const optionsText = Object.keys(SERVICES_OPTIONS).map(key => `*${key}* = ${SERVICES_OPTIONS[key].label}`).join('\n');
            let responseText = `Hola ${cliente.name}! 👋 Veo que esta es tu llamada n° ${cliente.count_calls}.\n¿Por qué servicio nos contactas? Responde con el número:\n\n${optionsText}`;
            await sock.sendMessage(remoteJid, { text: responseText });
            await logConversation(phoneKey, 'OUTBOUND', responseText, 'esperandoServicio');
            return;
        }

        estadosConversacion[conversationKey].lastActivity = new Date();
        const estadoActual = estadosConversacion[conversationKey].paso;
        const datosCliente = estadosConversacion[conversationKey].datosCliente;

        if (texto.length > 0) await logConversation(phoneKey, 'INBOUND', texto, estadoActual);

        // --- MANEJO DE ESTADOS ---

        if (estadoActual === "esperandoDni") {
            const esDniValido = /^\d+$/.test(texto.trim()) && parseInt(texto.trim()) > 0;
            if (!esDniValido) {
                let responseText = `❌ Entrada no válida. Por favor, ingresa tu *DNI* con números.`;
                await sock.sendMessage(remoteJid, { text: responseText });
                return;
            }
            estadosConversacion[conversationKey].datosCliente.dni = texto.trim();
            estadosConversacion[conversationKey].paso = "esperandoDireccion";
            let responseText = `✅ DNI registrado. Ahora, indícanos tu *dirección* completa.`;
            await sock.sendMessage(remoteJid, { text: responseText });
            return;
        }

        if (estadoActual === "esperandoDireccion") {
            if (texto.length < 5) {
                await sock.sendMessage(remoteJid, { text: `❌ Por favor, ingresa una dirección más detallada.` });
                return;
            }
            estadosConversacion[conversationKey].datosCliente.address = texto;
            estadosConversacion[conversationKey].paso = "esperandoTipoReclamo";
            const optionsText = Object.keys(CLAIM_TYPE_OPTIONS).map(key => `*${key}* = ${CLAIM_TYPE_OPTIONS[key].label}`).join('\n');
            let responseText = `✅ Dirección registrada. Finalmente, ¿cuál es el *tipo de reclamo*?:\n\n${optionsText}`;
            await sock.sendMessage(remoteJid, { text: responseText });
            return;
        }

        if (estadoActual === "esperandoTipoReclamo") {
            const tipoReclamo = CLAIM_TYPE_OPTIONS[textoNormalizado];
            if (!tipoReclamo) {
                await sock.sendMessage(remoteJid, { text: `❌ Opción no válida.` });
                return;
            }
            estadosConversacion[conversationKey].datosCliente.IdType = tipoReclamo.id;
            const dniHash = bcrypt.hashSync(estadosConversacion[conversationKey].datosCliente.dni, 8);
            estadosConversacion[conversationKey].datosCliente.dni = dniHash;

            cliente = new clients(estadosConversacion[conversationKey].datosCliente);
            cliente.count_calls = 1;
            await cliente.save();

            estadosConversacion[conversationKey].datosCliente = cliente;
            estadosConversacion[conversationKey].paso = "esperandoServicio";

            const optionsText = Object.keys(SERVICES_OPTIONS).map(key => `*${key}* = ${SERVICES_OPTIONS[key].label}`).join('\n');
            let responseText = `¡Perfecto! Registro completado.\n¿Por qué servicio nos contactas? Responde con el número:\n\n${optionsText}`;
            await sock.sendMessage(remoteJid, { text: responseText });
            return;
        }

        if (estadoActual === "esperandoServicio") {
            const servicio = SERVICES_OPTIONS[textoNormalizado];
            if (!servicio) {
                const optionsText = Object.keys(SERVICES_OPTIONS).map(key => `*${key}* = ${SERVICES_OPTIONS[key].label}`).join('\n');
                await sock.sendMessage(remoteJid, { text: `❌ Opción no válida. Elija una opción:\n\n${optionsText}` });
                return;
            }
            estadosConversacion[conversationKey].datosReclamo.IdService = servicio.id;
            estadosConversacion[conversationKey].paso = "esperandoDescripcion";
            let responseText = `Has seleccionado: *${servicio.label}*.\nAhora, por favor, describe *brevemente tu problema*.`;
            await sock.sendMessage(remoteJid, { text: responseText });
            return;
        }

        if (estadoActual === "esperandoDescripcion") {
            estadosConversacion[conversationKey].datosReclamo.descripcion = texto;
            estadosConversacion[conversationKey].paso = "esperandoRecurrencia";
            const optionsText = Object.keys(RECURRENCE_OPTIONS).map(key => `*${key}* = ${RECURRENCE_OPTIONS[key].label}`).join('\n');
            let responseText = `Gracias. Ahora, indícanos el nivel de *recurrencia*:\n\n${optionsText}`;
            await sock.sendMessage(remoteJid, { text: responseText });
            return;
        }

        if (estadoActual === "esperandoRecurrencia") {
            const recurrencia = RECURRENCE_OPTIONS[textoNormalizado];
            if (!recurrencia) {
                await sock.sendMessage(remoteJid, { text: `❌ Opción no válida.` });
                return;
            }
            estadosConversacion[conversationKey].datosReclamo.Idrecurrence = recurrencia.id;

            try {
                const reclamoId = Math.floor(1000 + Math.random() * 9000);
                const randomEmployeeId = await selectRandomEmployeeId();
                if (!randomEmployeeId) return;

                const nuevoReclamo = new claims({
                    IdClient: datosCliente._id,
                    IdEmployee: randomEmployeeId,
                    date: new Date(),
                    claimNumber: reclamoId,
                    IdService: estadosConversacion[conversationKey].datosReclamo.IdService,
                    desc: estadosConversacion[conversationKey].datosReclamo.descripcion,
                    state: 1,
                    Idrecurrence: estadosConversacion[conversationKey].datosReclamo.Idrecurrence,
                });

                await nuevoReclamo.save();
                await sendSingleClaimNotification(nuevoReclamo);

                estadosConversacion[conversationKey].paso = "esperandoCalificacion";
                let responseText = `✅ ¡Reclamo Registrado! N°: *${reclamoId}*.\n\nPor favor, califica mi servicio del 1 al 5.`;
                await sock.sendMessage(remoteJid, { text: responseText });
            } catch (error) { console.error(error); }
            return;
        }

        if (estadoActual === "esperandoCalificacion") {
            const rating = parseInt(texto);
            if (isNaN(rating) || rating < 1 || rating > 5) {
                await sock.sendMessage(remoteJid, { text: `❌ Por favor, ingresa una calificación del 1 al 5.` });
                return;
            }
            datosCliente.last_rating = rating;
            await datosCliente.save();
            let responseText = `⭐ ¡Gracias por tu calificación! Hemos terminado.`;
            await sock.sendMessage(remoteJid, { text: responseText });
            delete estadosConversacion[conversationKey];
            return;
        }

    } catch (error) {
        console.error(`💥 ERROR CRÍTICO:`, error);
    }
}