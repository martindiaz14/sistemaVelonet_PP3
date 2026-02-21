import nodemailer from 'nodemailer';
import cron from 'node-cron';
import Claims from '../db/schemas/claims.schema.js';
import Employee from '../db/schemas/employees.schema.js';
import Client from '../db/schemas/clients.schema.js'; 


const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
        user: process.env.EMAIL_USER || 'martindiazb14@gmail.com', 
        pass: process.env.EMAIL_PASS || 'kzjs saqi docv cuue' 
    }
});

export async function sendSingleClaimNotification(claim) {
    try {
        const populatedClaim = await Claims.findById(claim._id)
            .populate('IdClient')
            .populate('IdEmployee');

        const { IdEmployee, IdClient, claimNumber, desc } = populatedClaim;

        const mailOptions = {
            from: process.env.EMAIL_USER || 'tu_email@gmail.com',
            to: IdEmployee.mail,
            subject: `🆕 Nuevo Reclamo Asignado: N° ${claimNumber}`,
            html: `
                <p>Hola ${IdEmployee.name},</p>
                <p>Se te ha asignado un nuevo reclamo que requiere tu atención:</p>
                <div style="border: 1px solid #0284c7; padding: 15px; border-radius: 5px; background-color: #f0f9ff;">
                    <strong>Cliente:</strong> ${IdClient.name}<br>
                    <strong>Número de Reclamo:</strong> ${claimNumber}<br>
                    <strong>Calle y Numero:</strong> ${IdClient.address}<br>
                    <strong>Descripción:</strong> ${desc}<br>
                </div>
                <p>Por favor, ingresa al sistema para gestionarlo.</p>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`[Instant Mail] Notificación enviada a ${IdEmployee.mail} por el reclamo ${claimNumber}`);
    } catch (error) {
        console.error("❌ Error al enviar notificación instantánea:", error);
    }
}

async function sendPendingClaimsNotifications() {
    console.log(`[Scheduler] Ejecutando verificación de reclamos pendientes a las ${new Date().toISOString()}`);

    try {

        const pendingClaims = await Claims.find({ state: 1 })
            .populate('IdClient')  
            .populate('IdEmployee');

        if (pendingClaims.length === 0) {
            console.log("[Scheduler] No hay reclamos pendientes. Saliendo.");
            return;
        }

        const claimsByEmployee = pendingClaims.reduce((acc, claim) => {
            const employeeId = claim.IdEmployee._id.toString();
            if (!acc[employeeId]) {
                acc[employeeId] = {
                    employee: claim.IdEmployee,
                    claimsList: []
                };
            }
            acc[employeeId].claimsList.push(claim);
            return acc;
        }, {});

        for (const employeeId in claimsByEmployee) {
            const { employee, claimsList } = claimsByEmployee[employeeId];
            
            const claimsDetailsHtml = claimsList.map(claim => `
                <div style="border: 1px solid #ccc; padding: 10px; margin-bottom: 15px; border-radius: 5px;">
                    <strong>Asunto:</strong> El cliente (${claim.IdClient.name}) está esperando que atiendas su reclamo con el número (${claim.claimNumber}).<br>
                    <strong>Calle y Numero:</strong> ${claim.IdClient.address}<br>
                    <strong>Descripción:</strong> ${claim.desc}<br>
                    <small>Asignado desde: ${new Date(claim.date).toLocaleDateString()}</small>
                </div>
            `).join('');


            const mailOptions = {
                from: process.env.EMAIL_USER || 'tu_email@gmail.com',
                to: employee.mail,
                subject: `⚠️ Tienes ${claimsList.length} Reclamo(s) de Alta Prioridad Pendiente(s)`,
                html: `
                    <p>Hola ${employee.name},</p>
                    <p>La siguiente lista de reclamos te ha sido asignada y necesita tu atención inmediata. Han estado en estado PENDIENTE por más de 24 horas:</p>
                    ${claimsDetailsHtml}
                    <p>Por favor, gestiona estos reclamos a la brevedad.</p>
                `
            };

            await transporter.sendMail(mailOptions);
            console.log(`[Scheduler] Notificación enviada a ${employee.mail} (${claimsList.length} reclamo/s).`);
        }

    } catch (error) {
        console.error("❌ ERROR CRÍTICO en el envío de notificaciones:", error);
    }
}

export function startNotificationScheduler() {

    cron.schedule('30 12 * * *', () => {
        sendPendingClaimsNotifications();
    }, {
        scheduled: true,
        timezone: "America/Argentina/Buenos_Aires"
    });

    console.log("✅ Sistema de notificación automática iniciado: Se enviará cada 24 horas (medianoche).");
}