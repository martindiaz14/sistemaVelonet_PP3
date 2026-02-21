import express from 'express'
import claimsRouter from './routes/claims.routes.js';
import clientsRouter from './routes/clients.routes.js';
import employeesRouter from './routes/employees.routes.js';
import recurrenceRouter from './routes/recurrence.routes.js';
import severityRouter from './routes/severity.routes.js';
import typeRouter from './routes/type.routes.js';
import { startNotificationScheduler } from './services/gmail.service.js';
import { connectToDatabase } from './db/connection.js';
import 'dotenv/config'
import path from 'path';
import { fileURLToPath } from 'url';

const app = express()
const port = process.env.PORT

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());

app.listen(port, () => {
    console.log(`servidor levantado en puerto ${port}`)
})

process.on('uncaughtException', (err) => {
    console.error("Excepción no capturada:", err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error("Promesa rechazada no manejada:", promise, "razón:", reason);
});

app.use(express.static('./public/'))

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'index.html'));
});
app.use('/claims', claimsRouter)
app.use('/clients', clientsRouter)
app.use('/employees', employeesRouter)
app.use('/recurrence', recurrenceRouter)
app.use('/severity', severityRouter)
app.use('/type', typeRouter)

async function startServer() {
    try {
        await connectToDatabase();
        console.log("MongoDB está conectado y el scheduler se ha iniciado");

    } catch (error) {
        console.error("❌ Error al iniciar la aplicación (DB o Servidor):", error);
        process.exit(1); 
    }
}


startServer();