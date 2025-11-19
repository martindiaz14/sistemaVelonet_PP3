import clients from "../../db/schemas/clients.schema.js";
import claims from "../../db/schemas/claims.schema.js";
import { selectRandomEmployeeId, CLAIM_TYPE_OPTIONS, RECURRENCE_OPTIONS } from "./dbLoaders.js";
import bcrypt from 'bcryptjs';
import { OFFENSIVE_KEYWORDS, BLOCK_DURATION_MS } from "./botConfig.js";
import mongoose from "mongoose";
import LogModel from "../../db/schemas/controllers/conversationLog.schema.js";
import BlockedUser from "../../db/schemas/controllers/BlockedUser.schema.js";


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
                console.log(`⚠️ Log Rotado para ${phone}. Se reinició el historial.`);
            } else {
                updateOperation = {
                    $push: { messages: messageEntry },
                    $set: { lastActivity: new Date(), status: 'ACTIVE' }
                };
            }

            await LogModel.updateOne(
                { phone: phone },
                updateOperation
            );
            
            if (updateOperation.hasOwnProperty('$push')) {
                console.log(`✅ Log actualizado para ${phone}. Mensajes totales: ${existingSession.messages.length + 1}`);
            }

        } else {
            await LogModel.create({
                phone: phone,
                messages: [messageEntry], 
                lastActivity: new Date(),
                status: 'ACTIVE'
            });
            console.log(`✅ Log CREADO para ${phone}.`);
        }
    } catch (error) {
        console.error("❌ Fallo al guardar el log de conversación (Sesión):", error);
    }
}

export async function messageHandler(sock, msg) {
    let phoneKey = 'UNKNOWN';
    let remoteJid = 'UNKNOWN_JID';

    try {
        const m = msg.messages[0];
        remoteJid = m.key.remoteJid;

        if (m.key.fromMe) {
            return;
        }

        if (remoteJid.endsWith("@g.us")) {
            return;
        }
        if (remoteJid === 'status@broadcast') {
            return;
        }

        if (!m.message) {
            return;
        }
        if (m.key.participant) {
            return;
        }

        const conversationKey = remoteJid;
        const fromRaw = remoteJid.split("@")[0];
        phoneKey = fromRaw.replace(/\D/g, ''); 


        if (phoneKey.length < 5) {
            console.log(`❌ LOG 2.1: Descartado por clave de teléfono muy corta. Clave: ${phoneKey} (Longitud: ${phoneKey.length})`);
            return;
        }

        const messageTimestampMs = m.messageTimestamp * 1000;
        const nowMs = Date.now();
        const ageSeconds = (nowMs - messageTimestampMs) / 1000;

        if (ageSeconds > TIME_THRESHOLD_MS / 1000) {
            console.log(`❌ LOG 3.1: Descartado por antigüedad (${ageSeconds.toFixed(2)}s). JID: ${remoteJid}`);
            return;
        }

        console.log(`✅ LOG 4: Iniciando procesamiento. JID: ${remoteJid}, PhoneKey: ${phoneKey}, Estado Inicial: ${estadosConversacion[conversationKey]?.paso || 'NUEVO'}`);


        const texto = m.message.conversation?.trim() || m.message.extendedTextMessage?.text?.trim() || "";

        try {
            const existingBlock = await BlockedUser.findOne({ phone: phoneKey });
            if (existingBlock) {
                if (existingBlock.unblockDate > new Date()) {
                    console.log(`❌ LOG 5.1: Descartado. Usuario ${phoneKey} BLOQUEADO activamente.`);
                    const remainingTime = Math.ceil((existingBlock.unblockDate - new Date()) / (1000 * 60 * 60 * 24));
                    const responseText = `🔒 Tu número ha sido bloqueado por usar lenguaje inapropiado. Te quedan ${remainingTime} días de suspensión.`;
                    await sock.sendMessage(remoteJid, { text: responseText });
                    await logConversation(phoneKey, 'OUTBOUND', responseText, 'BLOCKED_ACTIVE');
                    return;
                } else {
                    await BlockedUser.deleteOne({ phone: phoneKey });
                }
            }
        } catch (error) {
            console.error(`❌ ERROR 5.2 en Bloqueo (DB): ${error.message} para ${phoneKey}`);
        }

        if (detectOffensiveLanguage(texto)) {
            console.log(`❌ LOG 6.1: Descartado. Detectado lenguaje OFENSIVO para ${phoneKey}.`);
            const unblockDate = new Date(Date.now() + BLOCK_DURATION_MS);

            const newBlock = new BlockedUser({
                phone: phoneKey,
                unblockDate: unblockDate,
                reason: 'Lenguaje detectado por IA'
            });
            await newBlock.save();

            const responseText = `⚠️ Advertencia: Se detectó lenguaje ofensivo. Tu número ha sido bloqueado por 7 días. No podremos procesar tu reclamo.`;
            await sock.sendMessage(remoteJid, { text: responseText });
            await logConversation(phoneKey, 'OUTBOUND', responseText, 'BLOCKED_NEW');
            return;
        }

        const textoNormalizado = texto.toLowerCase();
        const nombre = m.pushName || "Cliente";

        let cliente = await clients.findOne({ phone: phoneKey });

        const estadoGuardado = estadosConversacion[conversationKey];

        if (estadoGuardado) {
            const lastActivityMs = estadoGuardado.lastActivity ? estadoGuardado.lastActivity.getTime() : 0;
            const expirationMs = STATE_EXPIRATION_HOURS * 60 * 60 * 1000;

            if (nowMs - lastActivityMs > expirationMs) {
                console.log(`🗑️ LOG 7.1: Estado caducado para ${phoneKey}. Iniciando de nuevo.`);
                delete estadosConversacion[conversationKey];
            }
        }

        if (!estadosConversacion[conversationKey]) {
            console.log(`✅ LOG 7.2: Iniciando flujo de registro para ${phoneKey}.`);
            let responseText;
            if (!cliente) {
                let ppUrl = null;
                try { ppUrl = await sock.profilePictureUrl(remoteJid); } catch (e) { }

                estadosConversacion[conversationKey] = {
                    paso: "esperandoDni",
                    datosCliente: { name: nombre, phone: phoneKey, img: ppUrl, count_calls: 0 },
                    datosReclamo: {},
                    lastActivity: new Date()
                };
                responseText = `Hola ${nombre}! 👋 Soy tu asistente de reclamos. Para comenzar, por favor, indícanos tu *DNI* o número de identificación.`;
                await sock.sendMessage(remoteJid, { text: responseText });
                await logConversation(phoneKey, 'OUTBOUND', responseText, 'esperandoDni');
                return;
            }

            try {
                cliente.count_calls = (cliente.count_calls || 0) + 1;
                await cliente.save();
            } catch (error) {
                console.error(`❌ ERROR 7.3 al guardar contador de cliente ${phoneKey}:`, error.message);
            }

            estadosConversacion[conversationKey] = {
                paso: "esperandoDescripcion",
                datosCliente: cliente,
                datosReclamo: {},
                lastActivity: new Date()
            };
            responseText = `Hola ${cliente.name}! 👋 Veo que esta es tu llamada n° ${cliente.count_calls}.\n¿Podrías describir brevemente tu problema?`;
            await sock.sendMessage(remoteJid, { text: responseText });
            await logConversation(phoneKey, 'OUTBOUND', responseText, 'esperandoDescripcion');
            return;
        }

        estadosConversacion[conversationKey].lastActivity = new Date();
        const estadoActual = estadosConversacion[conversationKey].paso || "INICIO";
        const datosCliente = estadosConversacion[conversationKey].datosCliente;
        console.log(`➡️ LOG 8: Continuar flujo. Estado actual: ${estadoActual}.`);


        if (texto.length > 0) {
            await logConversation(phoneKey, 'INBOUND', texto, estadoActual);
        }


        if (estadoActual === "esperandoDni") {
            const textoDniLimpio = texto.trim();
            let responseText;

            const esDniValido = /^\d+$/.test(textoDniLimpio) && parseInt(textoDniLimpio) > 0;

            if (!esDniValido) {
                console.log(`❌ LOG 9.1: Entrada DNI inválida (no numérica o <= 0).`);
                responseText = `❌ Entrada no válida. Por favor, ingresa tu *DNI* utilizando solo **números enteros y positivos**.`;
                await sock.sendMessage(remoteJid, { text: responseText });
                await logConversation(phoneKey, 'OUTBOUND', responseText, estadoActual);
                return;
            }

            estadosConversacion[conversationKey].datosCliente.dni = textoDniLimpio;
            estadosConversacion[conversationKey].paso = "esperandoDireccion";
            responseText = `✅ DNI registrado. Ahora, por favor, indícanos tu *dirección* completa.`;
            await sock.sendMessage(remoteJid, { text: responseText });
            await logConversation(phoneKey, 'OUTBOUND', responseText, estadosConversacion[conversationKey].paso);
            return;
        }

        if (estadoActual === "esperandoDireccion") {
            let responseText;
            if (texto.length < 5) {
                console.log(`❌ LOG 10.1: Entrada Dirección muy corta.`);
                responseText = `❌ Por favor, ingresa una *dirección* más detallada.`;
                await sock.sendMessage(remoteJid, { text: responseText });
                await logConversation(phoneKey, 'OUTBOUND', responseText, estadoActual);
                return;
            }

            estadosConversacion[conversationKey].datosCliente.address = texto;
            estadosConversacion[conversationKey].paso = "esperandoTipoReclamo";

            const optionsText = Object.keys(CLAIM_TYPE_OPTIONS).map(key => `*${key}* = ${CLAIM_TYPE_OPTIONS[key].label}`).join('\n');
            responseText = `✅ Dirección registrada. Finalmente, ¿cuál es el *tipo de reclamo*? Responde solo con el número:\n\n${optionsText}`;
            await sock.sendMessage(remoteJid, { text: responseText });
            await logConversation(phoneKey, 'OUTBOUND', responseText, estadosConversacion[conversationKey].paso);
            return;
        }

        if (estadoActual === "esperandoTipoReclamo") {
            const tipoReclamo = CLAIM_TYPE_OPTIONS[textoNormalizado];
            let responseText;

            if (!tipoReclamo) {
                console.log(`❌ LOG 11.1: Opción de Tipo Reclamo inválida.`);
                responseText = `❌ Opción no válida. Por favor, selecciona una opción válida.`;
                await sock.sendMessage(remoteJid, { text: responseText });
                await logConversation(phoneKey, 'OUTBOUND', responseText, estadoActual);
                return;
            }

            estadosConversacion[conversationKey].datosCliente.IdType = tipoReclamo.id;

            try {
                const plainDni = estadosConversacion[conversationKey].datosCliente.dni;
                const dniHash = bcrypt.hashSync(plainDni, 8);
                estadosConversacion[conversationKey].datosCliente.dni = dniHash;

                cliente = new clients(estadosConversacion[conversationKey].datosCliente);
                cliente.count_calls = 1;
                await cliente.save();

                estadosConversacion[conversationKey].datosCliente = cliente;
                estadosConversacion[conversationKey].paso = "esperandoDescripcion";

                responseText = `¡Perfecto! Hemos completado tu registro como cliente (*${tipoReclamo.label}*).\n\nAhora, por favor, describe *brevemente tu problema*.`;
                await sock.sendMessage(remoteJid, { text: responseText });
                await logConversation(phoneKey, 'OUTBOUND', responseText, estadosConversacion[conversationKey].paso);
            } catch (error) {
                console.error(`❌ ERROR 11.2 al registrar cliente ${phoneKey}:`, error.message);
                delete estadosConversacion[conversationKey];
                responseText = "Hubo un error al registrar tus datos. Por favor, inténtalo de nuevo más tarde.";
                await sock.sendMessage(remoteJid, { text: responseText });
                await logConversation(phoneKey, 'OUTBOUND', responseText, 'ERROR_CLIENT_SAVE');
            }
            return;
        }

        if (estadoActual === "esperandoDescripcion") {
            estadosConversacion[conversationKey].datosReclamo.descripcion = texto;
            estadosConversacion[conversationKey].paso = "esperandoRecurrencia";

            const optionsText = Object.keys(RECURRENCE_OPTIONS).map(key => `*${key}* = ${RECURRENCE_OPTIONS[key].label}`).join('\n');
            const responseText = `Gracias por la descripción. Ahora, indícanos el nivel de *recurrencia* de este problema. Responde solo con el número:\n\n${optionsText}`;
            await sock.sendMessage(remoteJid, { text: responseText });
            await logConversation(phoneKey, 'OUTBOUND', responseText, estadosConversacion[conversationKey].paso);
            return;
        }

        if (estadoActual === "esperandoRecurrencia") {
            const recurrencia = RECURRENCE_OPTIONS[textoNormalizado];
            let responseText;

            if (!recurrencia) {
                console.log(`❌ LOG 12.1: Opción de Recurrencia inválida.`);
                responseText = `❌ Opción no válida. Por favor, selecciona una opción válida.`;
                await sock.sendMessage(remoteJid, { text: responseText });
                await logConversation(phoneKey, 'OUTBOUND', responseText, estadoActual);
                return;
            }

            estadosConversacion[conversationKey].datosReclamo.Idrecurrence = recurrencia.id;

            try {
                const reclamoId = Math.floor(1000 + Math.random() * 9000);
                const randomEmployeeId = await selectRandomEmployeeId();
                if (!randomEmployeeId) {
                    console.log(`❌ LOG 13.1: Fallo al asignar Empleado.`);
                    responseText = `❌ Error de sistema: No hay agentes disponibles para asignar el reclamo. Inténtelo más tarde.`;
                    await sock.sendMessage(remoteJid, { text: responseText });
                    await logConversation(phoneKey, 'OUTBOUND', responseText, estadoActual);
                    delete estadosConversacion[conversationKey];
                    return;
                }

                const nuevoReclamo = new claims({
                    IdClient: datosCliente._id,
                    IdEmployee: randomEmployeeId,
                    date: new Date(),
                    claimNumber: reclamoId,
                    desc: estadosConversacion[conversationKey].datosReclamo.descripcion,
                    state: 1,
                    Idrecurrence: estadosConversacion[conversationKey].datosReclamo.Idrecurrence,
                });

                await nuevoReclamo.save();

                estadosConversacion[conversationKey].paso = "esperandoCalificacion";

                responseText = `✅ ¡Reclamo Registrado! Su número es: *${reclamoId}*.\n\nAntes de terminar, por favor, *califica mi servicio* como bot del 1 (Muy Malo) al 5 (Excelente).`;
                await sock.sendMessage(remoteJid, { text: responseText });
                await logConversation(phoneKey, 'OUTBOUND', responseText, estadosConversacion[conversationKey].paso);
            } catch (error) {
                console.error(`❌ ERROR 13.2 al guardar reclamo ${phoneKey}:`, error.message);
                delete estadosConversacion[conversationKey];
                responseText = "Hubo un error al registrar el reclamo. Por favor, inténtalo de nuevo más tarde.";
                await sock.sendMessage(remoteJid, { text: responseText });
                await logConversation(phoneKey, 'OUTBOUND', responseText, 'ERROR_CLAIM_SAVE');
            }
            return;
        }

        if (estadoActual === "esperandoCalificacion") {
            const rating = parseInt(texto);
            let responseText;

            if (isNaN(rating) || rating < 1 || rating > 5) {
                console.log(`❌ LOG 14.1: Entrada de Calificación inválida.`);
                responseText = `❌ Por favor, ingresa una calificación válida del *1 al 5*.`;
                await sock.sendMessage(remoteJid, { text: responseText });
                await logConversation(phoneKey, 'OUTBOUND', responseText, estadoActual);
                return;
            }

            try {
                datosCliente.last_rating = rating;
                await datosCliente.save();
            } catch (error) {
                console.error(`❌ ERROR 14.2 al guardar rating de cliente ${phoneKey}:`, error.message);
            }

            responseText = `⭐ ¡Gracias por tu calificación de *${rating}*! Hemos terminado. Su reclamo será atendido a la brevedad.`;
            await sock.sendMessage(remoteJid, { text: responseText });
            await logConversation(phoneKey, 'OUTBOUND', responseText, 'FINALIZADO');

            delete estadosConversacion[conversationKey];
            return;
        }

    } catch (error) {
        const currentJid = msg.messages && msg.messages[0] ? msg.messages[0].key.remoteJid : 'UNKNOWN_JID';
        const currentPhoneKey = currentJid.split("@")[0].replace(/\D/g, '');
        console.error(`💥 ERROR CRÍTICO 15 en messageHandler para ${currentPhoneKey}:`, error);

        return;
    }
}