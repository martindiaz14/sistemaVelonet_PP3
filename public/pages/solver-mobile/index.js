import { quickResolveClaimService } from '../../APIs/claims.api.js';

document.addEventListener('DOMContentLoaded', () => {
    
    const resolveForm = document.getElementById('resolve-form');
    const submitBtn = document.getElementById('submit-btn');
    const messageBox = document.getElementById('message-box');

    if (!resolveForm) return;

    resolveForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (!token) {
            showMessage('❌ Error: Enlace inválido o sin autorización. Revisa tu correo.', 'bg-red-100 text-red-700 border border-red-300');
            return;
        }

        const descTec = document.getElementById('detailstec').value;
        const severity = document.getElementById('severety').value;

        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Procesando... ⏳';
        submitBtn.classList.replace('bg-sky-600', 'bg-gray-400');

        try {
            await quickResolveClaimService(token, { descTec, severity });

            showMessage('✅ ¡Excelente! El reclamo ha sido cerrado correctamente.', 'bg-emerald-100 text-emerald-800 border border-emerald-300');
            resolveForm.style.display = 'none';

        } catch (error) {
            showMessage(`❌ Ocurrió un error: ${error.message}`, 'bg-red-100 text-red-700 border border-red-300');
            resetButton(submitBtn);
        }
    });

    function showMessage(text, classes) {
        messageBox.className = `mt-6 text-center text-sm font-bold p-4 rounded-lg ${classes}`;
        messageBox.innerText = text;
        messageBox.classList.remove('hidden');
    }

    function resetButton(btn) {
        btn.disabled = false;
        btn.innerHTML = 'Confirmar Cierre ☑︎';
        btn.classList.replace('bg-gray-400', 'bg-sky-600');
    }
});