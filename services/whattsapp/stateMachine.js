import clients from "../../db/schemas/clients.schema.js";
import claims from "../../db/schemas/claims.schema.js";
import { selectRandomEmployeeId, CLAIM_TYPE_OPTIONS, RECURRENCE_OPTIONS } from "./dbLoaders.js";
import bcrypt from 'bcryptjs';
import { OFFENSIVE_KEYWORDS, BLOCK_DURATION_MS } from "./botConfig.js";
import ConversationLog from "../../db/schemas/controllers/conversationLog.schema.js";
import BlockedUser from "../../db/schemas/BlockedUser.schema.js"; 

const estadosConversacion = {}; 

function detectOffensiveLanguage(text) {
    const normalizedText = text.toLowerCase().replace(/[^\w\s]/gi, '');
    return OFFENSIVE_KEYWORDS.some(keyword => normalizedText.includes(keyword));
}

async function logConversation(phone, direction, content, state) {
    try {
        await ConversationLog.create({
            phone: phone,
            direction: direction,
            messageContent: content.substring(0, 500), 
            conversationState: state,
        });
    } catch (error) {
        console.error("❌ Fallo al guardar el log de conversación:", error);
    }
}

export async function messageHandler(sock, msg) {
    const m = msg.messages[0];

    if (m.key.fromMe) return; 

    const remoteJid = m.key.remoteJid;
    if (remoteJid.endsWith("@g.us")) return; 
    if (remoteJid === 'status@broadcast') return; 

    if (!m.message) return;
    if (m.key.participant) return; 
    
    const from = remoteJid.split("@")[0];
    
    if (isNaN(parseInt(from))) return; 

    const texto = m.message.conversation?.trim() || m.message.extendedTextMessage?.text?.trim() || "";


    const existingBlock = await BlockedUser.findOne({ phone: from });
    if (existingBlock) {
        if (existingBlock.unblockDate > new Date()) {
            const remainingTime = Math.ceil((existingBlock.unblockDate - new Date()) / (1000 * 60 * 60 * 24));
            const responseText = `🔒 Tu número ha sido bloqueado por usar lenguaje inapropiado. Te quedan ${remainingTime} días de suspensión.`;
            await sock.sendMessage(remoteJid, { text: responseText });
            await logConversation(from, 'OUTBOUND', responseText, 'BLOCKED_ACTIVE');
            return;
        } else {
            await BlockedUser.deleteOne({ phone: from });
        }
    }


    if (detectOffensiveLanguage(texto)) {
        const unblockDate = new Date(Date.now() + BLOCK_DURATION_MS); 
        
        const newBlock = new BlockedUser({
            phone: from,
            unblockDate: unblockDate,
            reason: 'Lenguaje detectado por IA'
        });
        await newBlock.save();
        
        const responseText = `⚠️ Advertencia: Se detectó lenguaje ofensivo. Tu número ha sido bloqueado por 7 días. No podremos procesar tu reclamo.`;
        await sock.sendMessage(remoteJid, { text: responseText });
        await logConversation(from, 'OUTBOUND', responseText, 'BLOCKED_NEW');
        return; 
    }
    
    const textoNormalizado = texto.toLowerCase();
    const nombre = m.pushName || "Cliente";

    let cliente = await clients.findOne({ phone: from }); 

    if (!estadosConversacion[from]) {
        let responseText;
        if (!cliente) {
            let ppUrl = null;
            try { ppUrl = await sock.profilePictureUrl(remoteJid); } catch (e) {}

            estadosConversacion[from] = { paso: "esperandoDni", datosCliente: { name: nombre, phone: from, img: ppUrl, count_calls: 0 }, datosReclamo: {} };
            responseText = `Hola ${nombre}! 👋 Soy tu asistente de reclamos. Para comenzar, por favor, indícanos tu *DNI* o número de identificación.`;
            await sock.sendMessage(remoteJid, { text: responseText });
            await logConversation(from, 'OUTBOUND', responseText, 'esperandoDni');
            return;
        }

        cliente.count_calls = (cliente.count_calls || 0) + 1;
        await cliente.save();

        estadosConversacion[from] = { paso: "esperandoDescripcion", datosCliente: cliente, datosReclamo: {} };
        responseText = `Hola ${cliente.name}! 👋 Veo que esta es tu llamada n° ${cliente.count_calls}.\n¿Podrías describir brevemente tu problema?`;
        await sock.sendMessage(remoteJid, { text: responseText });
        await logConversation(from, 'OUTBOUND', responseText, 'esperandoDescripcion');
        return;
    }

    const estadoActual = estadosConversacion[from].paso || "INICIO";
    const datosCliente = estadosConversacion[from].datosCliente;


    if (texto.length > 0) {
        await logConversation(from, 'INBOUND', texto, estadoActual);
    }
    

    if (estadoActual === "esperandoDni") {
        const dni = parseInt(texto);
        let responseText;
        if (isNaN(dni) || dni <= 0) { 
            responseText = `❌ Por favor, ingresa un *DNI válido* (solo números).`;
            await sock.sendMessage(remoteJid, { text: responseText }); 
            await logConversation(from, 'OUTBOUND', responseText, estadoActual);
            return; 
        }
        
        estadosConversacion[from].datosCliente.dni = texto;
        estadosConversacion[from].paso = "esperandoDireccion";
        responseText = `✅ DNI registrado. Ahora, por favor, indícanos tu *dirección* completa.`;
        await sock.sendMessage(remoteJid, { text: responseText });
        await logConversation(from, 'OUTBOUND', responseText, estadosConversacion[from].paso);
        return;
    }

    if (estadoActual === "esperandoDireccion") {
        let responseText;
        if (texto.length < 5) { 
            responseText = `❌ Por favor, ingresa una *dirección* más detallada.`;
            await sock.sendMessage(remoteJid, { text: responseText }); 
            await logConversation(from, 'OUTBOUND', responseText, estadoActual);
            return; 
        }
        
        estadosConversacion[from].datosCliente.address = texto;
        estadosConversacion[from].paso = "esperandoTipoReclamo";

        const optionsText = Object.keys(CLAIM_TYPE_OPTIONS).map(key => `*${key}* = ${CLAIM_TYPE_OPTIONS[key].label}`).join('\n');
        responseText = `✅ Dirección registrada. Finalmente, ¿cuál es el *tipo de reclamo*? Responde solo con el número:\n\n${optionsText}`;
        await sock.sendMessage(remoteJid, { text: responseText });
        await logConversation(from, 'OUTBOUND', responseText, estadosConversacion[from].paso);
        return;
    }

    if (estadoActual === "esperandoTipoReclamo") {
        const tipoReclamo = CLAIM_TYPE_OPTIONS[textoNormalizado];
        let responseText;

        if (!tipoReclamo) { 
            responseText = `❌ Opción no válida. Por favor, selecciona una opción válida.`;
            await sock.sendMessage(remoteJid, { text: responseText }); 
            await logConversation(from, 'OUTBOUND', responseText, estadoActual);
            return; 
        }

        estadosConversacion[from].datosCliente.IdType = tipoReclamo.id;

        try {
            const plainDni = estadosConversacion[from].datosCliente.dni;
            const dniHash = bcrypt.hashSync(plainDni, 8); 
            estadosConversacion[from].datosCliente.dni = dniHash;

            cliente = new clients(estadosConversacion[from].datosCliente);
            cliente.count_calls = 1;
            await cliente.save();
            estadosConversacion[from].datosCliente = cliente;
            estadosConversacion[from].paso = "esperandoDescripcion";
            
            responseText = `¡Perfecto! Hemos completado tu registro como cliente (*${tipoReclamo.label}*).\n\nAhora, por favor, describe *brevemente tu problema*.`;
            await sock.sendMessage(remoteJid, { text: responseText });
            await logConversation(from, 'OUTBOUND', responseText, estadosConversacion[from].paso);
        } catch (error) {
            console.error("Error al guardar el cliente:", error.message);
            delete estadosConversacion[from];
            responseText = "Hubo un error al registrar tus datos. Por favor, inténtalo de nuevo más tarde.";
            await sock.sendMessage(remoteJid, { text: responseText });
            await logConversation(from, 'OUTBOUND', responseText, 'ERROR_CLIENT_SAVE');
        }
        return;
    }

    if (estadoActual === "esperandoDescripcion") {
        estadosConversacion[from].datosReclamo.descripcion = texto;
        estadosConversacion[from].paso = "esperandoRecurrencia";

        const optionsText = Object.keys(RECURRENCE_OPTIONS).map(key => `*${key}* = ${RECURRENCE_OPTIONS[key].label}`).join('\n');
        const responseText = `Gracias por la descripción. Ahora, indícanos el nivel de *recurrencia* de este problema. Responde solo con el número:\n\n${optionsText}`;
        await sock.sendMessage(remoteJid, { text: responseText });
        await logConversation(from, 'OUTBOUND', responseText, estadosConversacion[from].paso);
        return;
    }

    if (estadoActual === "esperandoRecurrencia") {
        const recurrencia = RECURRENCE_OPTIONS[textoNormalizado];
        let responseText;

        if (!recurrencia) { 
            responseText = `❌ Opción no válida. Por favor, selecciona una opción válida.`;
            await sock.sendMessage(remoteJid, { text: responseText }); 
            await logConversation(from, 'OUTBOUND', responseText, estadoActual);
            return; 
        }

        estadosConversacion[from].datosReclamo.Idrecurrence = recurrencia.id;

        const reclamoId = Math.floor(1000 + Math.random() * 9000);
        const randomEmployeeId = await selectRandomEmployeeId();
        if (!randomEmployeeId) {
            responseText = `❌ Error de sistema: No hay agentes disponibles para asignar el reclamo. Inténtelo más tarde.`;
            await sock.sendMessage(remoteJid, { text: responseText });
            await logConversation(from, 'OUTBOUND', responseText, estadoActual);
            delete estadosConversacion[from];
            return;
        }
        
        const nuevoReclamo = new claims({
            IdClient: datosCliente._id,
            IdEmployee: randomEmployeeId,
            date: new Date(),
            claimNumber: reclamoId,
            desc: estadosConversacion[from].datosReclamo.descripcion,
            state: 1,
            Idrecurrence: estadosConversacion[from].datosReclamo.Idrecurrence,
        });

        await nuevoReclamo.save();

        estadosConversacion[from].paso = "esperandoCalificacion";

        responseText = `✅ ¡Reclamo Registrado! Su número es: *${reclamoId}*.\n\nAntes de terminar, por favor, *califica mi servicio* como bot del 1 (Muy Malo) al 5 (Excelente).`;
        await sock.sendMessage(remoteJid, { text: responseText });
        await logConversation(from, 'OUTBOUND', responseText, estadosConversacion[from].paso);
        return;
    }
    
    if (estadoActual === "esperandoCalificacion") {
        const rating = parseInt(texto);
        let responseText;

        if (isNaN(rating) || rating < 1 || rating > 5) { 
            responseText = `❌ Por favor, ingresa una calificación válida del *1 al 5*.`;
            await sock.sendMessage(remoteJid, { text: responseText }); 
            await logConversation(from, 'OUTBOUND', responseText, estadoActual);
            return; 
        }

        datosCliente.last_rating = rating;
        await datosCliente.save();

        responseText = `⭐ ¡Gracias por tu calificación de *${rating}*! Hemos terminado. Su reclamo será atendido a la brevedad.`;
        await sock.sendMessage(remoteJid, { text: responseText });
        await logConversation(from, 'OUTBOUND', responseText, 'FINALIZADO');
        
        delete estadosConversacion[from];
        return;
    }
}