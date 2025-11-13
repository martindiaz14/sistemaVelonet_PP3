import { generatePredefinedReport } from '../../../../APIs/claims.api.js';


export function setupReportListeners(handleActionCallback) {
    const generateBtn = document.getElementById('preview-report-btn');
    const reportButton = document.getElementById('report-button');
    const reportPopup = document.getElementById('popup-div');

    if (generateBtn) {
        generateBtn.addEventListener('click', handleActionCallback);
    }


    if (reportButton && reportPopup) {
        reportButton.addEventListener('click', (event) => {
            reportPopup.classList.toggle('hidden');
            event.stopPropagation();
        });
    }

    document.addEventListener('click', function (event) {
        if (reportPopup && !reportPopup.classList.contains('hidden')) {
            const isClickInsideReportArea =
                event.target.closest('#popup-div') ||
                event.target.closest('#report-button');

            if (!isClickInsideReportArea) {
                reportPopup.classList.add('hidden');
            }
        }
    });
}