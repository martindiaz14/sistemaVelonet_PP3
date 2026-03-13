import clients from "../../db/schemas/clients.schema.js";
import claims from "../../db/schemas/claims.schema.js";
import service from "../../db/schemas/service.schema.js";
import { CLAIM_TYPE_OPTIONS, RECURRENCE_OPTIONS, SERVICES_OPTIONS } from "./dbLoaders.js";
import { getNextEmployee } from "../../db/actions/employees.actions.js";
import bcrypt from 'bcryptjs';
import { OFFENSIVE_KEYWORDS, BLOCK_DURATION_MS } from "./botConfig.js";
import mongoose from "mongoose";
import LogModel from "../../db/schemas/controllers/conversationLog.schema.js";
import BlockedUser from "../../db/schemas/controllers/BlockedUser.schema.js";
import { sendSingleClaimNotification } from "../gmail.service.js";


const TIME_THRESHOLD_MS = 60000;
const estadosConversacion = {};
const MAX_MESSAGES_PER_SESSION = 25;

function detectOffensiveLanguage(text) {
    if (!text) return false;
    const normalizedText = text.toLowerCase().replace(/[^\w\s]/gi, '');
    return OFFENSIVE_KEYWORDS.some(keyword => normalizedText.includes(keyword));
}

async function logConversation(phone, direction, content, state) {
    try {
        const messageEntry = {
            direction: direction,
            content: content.substring(0, 500),
            state: state || 'INICIAL',
        };

        const existingSession = await LogModel.findOne({ phone: phone });

        if (existingSession) {
            let updateOperation = (existingSession.messages.length >= MAX_MESSAGES_PER_SESSION)
                ? { $set: { messages: [messageEntry], lastActivity: new Date(), status: 'ROTATED' } }
                : { $push: { messages: messageEntry }, $set: { lastActivity: new Date(), status: 'ACTIVE' } };

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
        console.error("❌ Fallo al guardar el log:", error);
    }
}

export async function messageHandler(sock, msg) {
    let phoneKey = 'UNKNOWN';
    let remoteJid = 'UNKNOWN_JID';

    try {
        const m = msg.messages[0];
        if (!m || !m.message) return;

        remoteJid = m.key.remoteJid;

        if (remoteJid.endsWith('@g.us') || remoteJid === 'status@broadcast' || m.key.fromMe) return;

        const messageType = Object.keys(m.message)[0];
        const allowedTypes = ['conversation', 'extendedTextMessage'];
        if (!allowedTypes.includes(messageType)) return;

        const texto = m.message.conversation?.trim() || m.message.extendedTextMessage?.text?.trim() || "";
        if (!texto && !m.key.fromMe) return;

        const conversationKey = remoteJid;
        phoneKey = remoteJid.split("@")[0].replace(/\D/g, '');

        const messageTimestamp = m.messageTimestamp?.low || m.messageTimestamp;
        const nowMs = Date.now();
        if ((nowMs - (messageTimestamp * 1000)) > TIME_THRESHOLD_MS) {
            console.log(`⏳ Mensaje antiguo ignorado de ${phoneKey}`);
            return;
        }

        const existingBlock = await BlockedUser.findOne({ phone: phoneKey });
        if (existingBlock) {
            if (existingBlock.unblockDate > new Date()) {
                const diff = existingBlock.unblockDate - new Date();
                const remainingDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
                await sock.sendMessage(remoteJid, { text: `🔒 Tu número está bloqueado por ${remainingDays} días más.` });
                return;
            } else {
                await BlockedUser.deleteOne({ phone: phoneKey });
            }
        }

        if (detectOffensiveLanguage(texto)) {
            const unblockDate = new Date(Date.now() + BLOCK_DURATION_MS);
            await new BlockedUser({ phone: phoneKey, unblockDate, reason: 'Lenguaje ofensivo' }).save();
            await sock.sendMessage(remoteJid, { text: `⚠️ Lenguaje inapropiado detectado. Bloqueado por 7 días.` });
            delete estadosConversacion[conversationKey];
            return;
        }

        const textoNormalizado = texto.toLowerCase();
        const nombrePush = m.pushName || "Cliente";

        if (!estadosConversacion[conversationKey]) {
            let cliente = await clients.findOne({ phone: phoneKey });

            if (!cliente) {
                estadosConversacion[conversationKey] = {
                    paso: "esperandoDni",
                    datosCliente: { name: nombrePush, phone: phoneKey, count_calls: 0 },
                    datosReclamo: {},
                    lastActivity: new Date()
                };
                const saludo = `Hola ${nombrePush}! 👋 Soy el asistente virtual. Para empezar, ingresa tu *DNI* (solo números):`;
                await sock.sendMessage(remoteJid, { text: saludo });
                await logConversation(phoneKey, 'OUTBOUND', saludo, 'esperandoDni');
            } else {
                cliente.count_calls = (cliente.count_calls || 0) + 1;
                await cliente.save();

                estadosConversacion[conversationKey] = {
                    paso: "esperandoServicio",
                    datosCliente: cliente,
                    datosReclamo: {},
                    lastActivity: new Date()
                };

                const optionsText = Object.keys(SERVICES_OPTIONS).map(k => `*${k}* - ${SERVICES_OPTIONS[k].label}`).join('\n');
                const saludoC = `Hola ${cliente.name}! 👋 (Llamada #${cliente.count_calls})\n¿Por qué servicio nos contactas esta vez? Responde con uno de los números que te ofrezco:\n\n${optionsText}`;
                await sock.sendMessage(remoteJid, { text: saludoC });
                await logConversation(phoneKey, 'OUTBOUND', saludoC, 'esperandoServicio');
            }
            return;
        }

        const session = estadosConversacion[conversationKey];
        session.lastActivity = new Date();
        const pasoActual = session.paso;

        await logConversation(phoneKey, 'INBOUND', texto, pasoActual);

        switch (pasoActual) {
            case "esperandoDni":
                if (!/^\d{7,10}$/.test(texto)) {
                    await sock.sendMessage(remoteJid, { text: "❌ DNI no válido. Ingresa entre 7 y 10 números." });
                    return;
                }
                session.datosCliente.dni = texto;
                session.paso = "esperandoDireccion";
                await sock.sendMessage(remoteJid, { text: "✅ DNI recibido. Ahora dime tu *dirección completa*:" });
                break;

            case "esperandoDireccion":
                if (texto.length < 5) {
                    await sock.sendMessage(remoteJid, { text: "❌ Dirección muy corta. Por favor, sé más específico." });
                    return;
                }
                session.datosCliente.address = texto;
                session.paso = "esperandoTipoReclamo";
                const typesT = Object.keys(CLAIM_TYPE_OPTIONS).map(k => `*${k}* - ${CLAIM_TYPE_OPTIONS[k].label}`).join('\n');
                await sock.sendMessage(remoteJid, { text: `✅ Dirección guardada. ¿Qué tipo de reclamo es?\n\n${typesT}` });
                break;

            case "esperandoTipoReclamo":
                const tipo = CLAIM_TYPE_OPTIONS[textoNormalizado];
                if (!tipo) {
                    await sock.sendMessage(remoteJid, { text: "❌ Opción inválida. Selecciona un número de la lista." });
                    return;
                }
                session.datosCliente.IdType = tipo.id;
                const salt = bcrypt.genSaltSync(8);
                const dniOriginal = session.datosCliente.dni;
                session.datosCliente.dni = bcrypt.hashSync(dniOriginal, salt);

                const nuevoCliente = await clients.create(session.datosCliente);
                session.datosCliente = nuevoCliente;

                session.paso = "esperandoServicio";
                const servs = Object.keys(SERVICES_OPTIONS).map(k => `*${k}* - ${SERVICES_OPTIONS[k].label}`).join('\n');
                await sock.sendMessage(remoteJid, { text: `¡Registro exitoso! 🎉\n¿Sobre qué servicio es el reclamo?\n\n${servs}` });
                break;

            case "esperandoServicio":
                const serv = SERVICES_OPTIONS[textoNormalizado];
                if (!serv) {
                    await sock.sendMessage(remoteJid, { text: "❌ Selecciona un servicio válido, responde de forma numerica con alguna de las opciones que te ofreci(1, 2 o 3)." });
                    return;
                }
                session.datosReclamo.IdService = serv.id;
                session.paso = "esperandoDescripcion";
                await sock.sendMessage(remoteJid, { text: `Elegiste: *${serv.label}*.\nCuéntame brevemente en texto el problema que este servicio te esta generando:` });
                break;

            case "esperandoDescripcion":
                if (texto.length < 10) {
                    await sock.sendMessage(remoteJid, { text: "❌ Por favor, describe el problema con mas palabras, se lo mas preciso posible." });
                    return;
                }
                session.datosReclamo.descripcion = texto;
                session.paso = "esperandoRecurrencia";
                const recs = Object.keys(RECURRENCE_OPTIONS).map(k => `*${k}* - ${RECURRENCE_OPTIONS[k].label}`).join('\n');
                await sock.sendMessage(remoteJid, { text: `¿Qué tan seguido ocurre esto?\n\n${recs}` });
                break;

            case "esperandoRecurrencia":
                const rec = RECURRENCE_OPTIONS[textoNormalizado];
                if (!rec) {
                    await sock.sendMessage(remoteJid, { text: "❌ Selecciona una opción numerica válida, de las opciones que te ofreci anteriormente(1, 2 o 3)." });
                    return;
                }

                const IdEmployee = await getNextEmployee();
                let claimNumber;
                let isUnique = false;

                while (!isUnique) {
                    claimNumber = Math.floor(100000 + Math.random() * 900000);
                    const existingClaim = await claims.exists({ claimNumber });
                    if (!existingClaim) {
                        isUnique = true;
                    }
                }

                const newClaimData = await claims.create({
                    IdClient: session.datosCliente._id,
                    IdEmployee: IdEmployee,
                    date: new Date(),
                    claimNumber: claimNumber,
                    IdService: session.datosReclamo.IdService,
                    desc: session.datosReclamo.descripcion,
                    state: 1,
                    Idrecurrence: rec.id,
                });

                await sendSingleClaimNotification(newClaimData);

                session.paso = "esperandoCalificacion";
                await sock.sendMessage(remoteJid, { text: `✅ *Reclamo creado!* N°: ${claimNumber}\n\nPor último, califica mi atención del 1 al 5:` });
                break;

            case "esperandoCalificacion":
                const nota = parseInt(texto);
                if (isNaN(nota) || nota < 1 || nota > 5) {
                    await sock.sendMessage(remoteJid, { text: "❌ Solo números del 1 al 5." });
                    return;
                }
                await clients.findByIdAndUpdate(session.datosCliente._id, { last_rating: nota });
                await sock.sendMessage(remoteJid, { text: "⭐ Gracias por tu calificacion, tu reclamo sera atendido lo mas pronto posible, estate atento a cualquier llamada de nosotros y tenes que estar presente en tu hogar. ¡Que tengas un buen día!" });
                delete estadosConversacion[conversationKey];
                break;
        }

    } catch (error) {
        console.error(`💥 ERROR EN HANDLER:`, error);
        try {
            await sock.sendMessage(remoteJid, { text: "Lo siento, hubo un error técnico. Escribe cualquier cosa para reiniciar." });
            delete estadosConversacion[remoteJid];
        } catch (e) { }
    }
}