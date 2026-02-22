import { connectToDatabase } from "../../db/connection.js";
import qrcode from "qrcode-terminal";
import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";

import { loadClaimTypeOptions, loadRecurrenceOptions, loadServicesOptions} from "./dbLoaders.js";
import { messageHandler } from "./stateMachine.js";



let IS_BOT_RUNNING = false;

export async function startWhatsappBot() {
    if (IS_BOT_RUNNING) {
        console.warn("⚠️ El bot ya está en ejecución.");
        return;
    }
    IS_BOT_RUNNING = true;

    try {
        await connectToDatabase();
        await loadClaimTypeOptions();
        await loadRecurrenceOptions();
        await loadServicesOptions();
    } catch (e) {
        console.error("🚨 Falló la conexión inicial.", e);
        IS_BOT_RUNNING = false;
        return;
    }

    const connect = async () => {
        // ✅ Asegúrate de que la ruta "/auth_info" sea válida en Windows. 
        // Es mejor usar una ruta relativa como "./auth_info"
        const { state, saveCreds } = await useMultiFileAuthState("./auth_info");
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            logger: pino({ level: "error" }),
            auth: state, 
            printQRInTerminal: false,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 0,
        });


        sock.ev.on("creds.update", saveCreds);

        sock.ev.on("connection.update", (update) => {
            const { connection, lastDisconnect, qr } = update;
            if (qr) {
                qrcode.generate(qr, { small: true });
                console.log("Escanea el QR para conectar.");
            }
            if (connection === "close") {
                const statusCode = (lastDisconnect?.error)?.output?.statusCode || (lastDisconnect?.error)?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                if (shouldReconnect) {
                    setTimeout(() => connect(), 5000);
                } else {
                    console.log("❌ Sesión cerrada.");
                    IS_BOT_RUNNING = false;
                }
            } else if (connection === "open") {
                console.log("✅ Bot conectado a WhatsApp.");
            }
        });

        sock.ev.on("messages.upsert", async (msg) => {
            // Tu lógica de filtrado de JID...
            if (msg.type === 'notify') {
                await messageHandler(sock, msg);
            }
        });
    };

    connect();
}