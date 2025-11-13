import { renderCharts } from './chartRenderer.js'; 

export async function exportChartsToPDF(reportOptions, reportData, chartInstancesToExport) {
    const element = document.getElementById('report-content-area');

    if (!element) {
        console.error("No se encontró el elemento contenedor '#report-content-area'.");
        alert("Fallo al encontrar la vista de reporte.");
        return;
    }
    
    const filename = `reporte-${reportOptions.reportKey}-${new Date().toISOString().slice(0, 10)}.pdf`;
    
    const options = {
        margin: 10,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true }, 
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    const downloadBtn = document.getElementById('download-pdf-btn');
    if(downloadBtn) downloadBtn.style.display = 'none';

    try {
        await html2pdf().set(options).from(element).save();
        alert('¡Reporte generado y descargado exitosamente!');
    } catch (error) {
        console.error("Error durante la generación de html2pdf:", error);
        alert("Ocurrió un error al generar el PDF. Verifica la consola.");
    } finally {
        if(downloadBtn) downloadBtn.style.display = 'block';
    }
}