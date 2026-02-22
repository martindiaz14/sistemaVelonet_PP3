import mongoose from "mongoose";
import { startNotificationScheduler } from "../services/gmail.service.js";
import { startWhatsappBot } from "../services/whatsapp/botStarter.js";
import 'dotenv/config'
const MONGODB_URI = process.env.MONGODB_URI

let cached = global.mongoose || { conn: null, promise: null }

export const connectToDatabase = async () => {
    if (cached.conn) return cached.conn

    if (!MONGODB_URI) throw new error('MONGODB_URI is missing')

    cached.promise = cached.promise || mongoose.connect(MONGODB_URI, {
        dbName: 'DIGICOM_Velonet',
        bufferCommands: false,
    })
    cached.conn = await cached.promise

    if (!cached.conn.isSchedulerStarted) {
        //startNotificationScheduler();
        //startWhatsappBot();
        cached.conn.isSchedulerStarted = true;
        console.log("✅ Sistema de notificación automática iniciado.");
    }

    return cached.conn

}