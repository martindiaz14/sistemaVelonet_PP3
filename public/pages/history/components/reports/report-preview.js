import { renderReportContent, downloadReportPDF } from './previewRenderer.js'; 

document.addEventListener('DOMContentLoaded', () => {
    renderReportContent();
    
    const downloadBtn = document.getElementById('download-pdf-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadReportPDF);
    }
});