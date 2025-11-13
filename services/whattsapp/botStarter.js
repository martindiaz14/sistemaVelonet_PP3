import { connectToDatabase } from "../../../db/connection.js";
import qrcode from "qrcode-terminal";
import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";

import { loadClaimTypeOptions, loadRecurrenceOptions } from "./dbLoaders.js";
import { messageHandler } from "./stateMachine.js";


let IS_BOT_RUNNING = false; 

export async function startWhatsappBot() {
    if (IS_BOT_RUNNING) {
        console.warn("⚠️ Intento de iniciar el bot de WhatsApp, pero ya está en ejecución.");
        return;
    }
    IS_BOT_RUNNING = true;


    try {
        await connectToDatabase();
        await loadClaimTypeOptions();
        await loadRecurrenceOptions();
    } catch (e) {
        console.error("🚨 El bot no puede iniciar. Falló la conexión/carga de opciones.", e);
        IS_BOT_RUNNING = false;
        return;
    }

    const { state, saveCreds } = await useMultiFileAuthState("./auth_info");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        auth: state,
        browser: ['Velonet Claim Bot', 'Chrome', '110.0.0.0'] 
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            qrcode.generate(qr, { small: true });
            console.log("Escanea el QR para conectar el Bot de WhatsApp.");
        }
        if (connection === "close") {
            const boomError = new Boom(lastDisconnect?.error);
            const statusCode = boomError.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            
            if (shouldReconnect) {
                console.log("Conexión perdida. Intentando reconectar...");
                startWhatsappBot(); 
            } else {
                console.log("❌ Sesión cerrada. Vuelve a iniciar para generar nuevo QR.");
                IS_BOT_RUNNING = false;
            }
        } else if (connection === "open") {
            console.log("✅ Bot conectado a WhatsApp.");
        }
    });

    sock.ev.on("messages.upsert", async (msg) => {
        await messageHandler(sock, msg);
    });
}