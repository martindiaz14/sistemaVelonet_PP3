import nodemailer from 'nodemailer';
import cron from 'node-cron';
import jwt from 'jsonwebtoken'; // ⬅️ AGREGADO
import Claims from '../db/schemas/claims.schema.js';
import Services from '../db/schemas/service.schema.js';
import Employee from '../db/schemas/employees.schema.js';
import Client from '../db/schemas/clients.schema.js'; 

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
        user: process.env.EMAIL_USER || 'martindiazb14@gmail.com', 
        pass: process.env.EMAIL_PASS || 
    }
});

export async function sendSingleClaimNotification(claim) {
    try {
        const populatedClaim = await Claims.findById(claim._id)
            .populate('IdClient')
            .populate('IdEmployee')
            .populate('IdService');

        const { IdEmployee, IdClient, claimNumber, IdService, desc, _id } = populatedClaim;

        const token = jwt.sign({ claimId: _id }, process.env.SECRET, { expiresIn: '7d' });
        const magicLink = `${FRONTEND_URL}/pages/solver-mobile/index.html?token=${token}`;

        const mailOptions = {
            from: process.env.EMAIL_USER || 'tu_email@gmail.com',
            to: IdEmployee.mail,
            subject: `🆕 Nuevo Reclamo Asignado: N° ${claimNumber}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
                    <p>Hola <strong>${IdEmployee.name}</strong>,</p>
                    <p>Se te ha asignado un nuevo reclamo que requiere tu atención:</p>
                    <div style="border-left: 4px solid #0284c7; padding: 15px; border-radius: 5px; background-color: #f0f9ff;">
                        <strong>Cliente:</strong> ${IdClient.name}<br>
                        <strong>Número de Reclamo:</strong> #${claimNumber}<br>
                        <strong>Calle y Numero:</strong> ${IdClient.address}<br>
                        <strong>Numero de Contacto:</strong> ${IdClient.phone}<br>
                        <strong>Servicio:</strong> ${IdService.name}<br>
                        <strong>Descripción:</strong> ${desc}<br>
                    </div>
                    
                    <div style="margin-top: 20px; text-align: center;">
                        <a href="${magicLink}" style="background-color: #0284c7; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                            Resolver Reclamo Ahora ☑︎
                        </a>
                    </div>
                    <p style="font-size: 12px; color: #666; text-align: center; margin-top: 15px;">Este enlace expira en 7 dias, pasado este timpo debe haber un cierrre desde el sistema principal.</p>
                </div>
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
            .populate('IdEmployee')
            .populate('IdService');

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
            
            const claimsDetailsHtml = claimsList.map(claim => {
                const token = jwt.sign({ claimId: claim._id }, process.env.SECRET, { expiresIn: '24h' });
                const magicLink = `${FRONTEND_URL}/quick-resolve.html?token=${token}`;

                return `
                <div style="border: 1px solid #e5e7eb; padding: 15px; margin-bottom: 15px; border-radius: 8px; background-color: #fff;">
                    <strong>Asunto:</strong> El cliente (${claim.IdClient.name}) está esperando que atiendas su reclamo con el número (#${claim.claimNumber}).<br>
                    <strong>Calle y Numero:</strong> ${claim.IdClient.address}<br>
                    <strong>Numero de Contacto:</strong> ${IdClient.phone}<br>
                    <strong>Servicio:</strong> ${claim.IdService.name}<br>
                    <strong>Descripción:</strong> ${claim.desc}<br>
                    <small style="color: #d97706;">Asignado desde: ${new Date(claim.date).toLocaleDateString()}</small>
                    
                    <div style="margin-top: 15px;">
                        <a href="${magicLink}" style="background-color: #0ea5e9; color: white; padding: 8px 15px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px; display: inline-block;">
                            Cerrar #${claim.claimNumber}
                        </a>
                    </div>
                </div>
                `;
            }).join('');


            const mailOptions = {
                from: process.env.EMAIL_USER || 'tu_email@gmail.com',
                to: employee.mail,
                subject: `⚠️ Tienes ${claimsList.length} Reclamo(s) de Alta Prioridad Pendiente(s)`,
                html: `
                    <div style="font-family: Arial, sans-serif; background-color: #f9fafb; padding: 20px;">
                        <p>Hola <strong>${employee.name}</strong>,</p>
                        <p>La siguiente lista de reclamos te ha sido asignada y necesita tu atención inmediata. Han estado en estado PENDIENTE por más de 24 horas:</p>
                        
                        ${claimsDetailsHtml}
                        
                        <p style="text-align: center; margin-top: 20px;">Por favor, gestiona estos reclamos a la brevedad para cumplir con los tiempos de respuesta.</p>
                    </div>
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

