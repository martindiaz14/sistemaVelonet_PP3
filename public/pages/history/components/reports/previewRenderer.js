// /components/reports/previewRenderer.js

// NOTA: Se asume que drawApexChartInPreview y drawApexLineChartInPreview
// están definidas en este archivo o importadas (si usas un archivo chartRenderer.js separado).

const CHART_COLORS = {
    GRAVITY_COLORS: ['#10B981', '#F59E0B', '#EF4444'], 
    RATING_COLORS: ['#EF4444', '#F97316', '#FACC15', '#84CC16', '#10B981'], 
    TREND_COLORS: {
        CREATED: '#3B82F6', 
        RESOLVED: '#10B981', 
    }
};

// ====================================================================
// UTILIDADES DE DIBUJO (MOCK - ASUME QUE ESTÁN DEFINIDAS EN OTRO LUGAR O AQUÍ)
// ====================================================================

// --- (CÓDIGO DE LAS FUNCIONES drawApexChartInPreview y drawApexLineChartInPreview DEBE ESTAR AQUÍ) ---

/** Dibuja el gráfico de Barras/Circular (ApexCharts) en un DIV específico. */
export function drawApexChartInPreview(data, chartType, title, targetDivId) {
if (!Array.isArray(data) || data.length === 0) {
        console.warn(`Skipping chart drawing for ${title}: No valid data array received.`);
        return null;
    }
    const targetDiv = document.getElementById(targetDivId);
    if (!targetDiv) return null;

    targetDiv.innerHTML = ''; 
    const isRatingChart = title.includes('Calificación');
    const isPieChart = chartType === 'doughnut';
    const isHorizontalBar = !isPieChart;
    const labels = data.map(item => item.name || `Rating ${item.rating}`);
    const counts = data.map(item => item.count);
    const colors = isRatingChart ? CHART_COLORS.RATING_COLORS : CHART_COLORS.GRAVITY_COLORS;

    const options = {
        chart: { type: isPieChart ? 'donut' : 'bar', height: '100%', width: '100%', animations: { enabled: false }, toolbar: { show: false } },
        title: { text: title, align: 'left', style: { fontSize: '14px', fontWeight: 'bold' } },
        series: isPieChart ? counts : [{ name: 'Conteo', data: counts }],
        labels: isPieChart ? labels : undefined,
        xaxis: isPieChart ? undefined : { categories: labels, labels: { style: { fontSize: '10px' } } },
        plotOptions: { bar: { horizontal: isHorizontalBar, columnWidth: '55%' }, pie: { donut: { size: '65%' } }},
        colors: colors,
        legend: { position: 'bottom', fontSize: '12px' }
    };

    const chart = new ApexCharts(targetDiv, options);
    chart.render(); 
    return chart; 
}

/** Dibuja el gráfico de Líneas de Tendencia (ApexCharts) en un DIV específico. */
export function drawApexLineChartInPreview(data, title, targetDivId) {
    if (!data || data.length === 0) return null;
    const targetDiv = document.getElementById(targetDivId);
    if (!targetDiv) return null;
    
    targetDiv.innerHTML = ''; 
    const labels = data.map(item => item.date);
    const createdData = data.map(item => item.created);
    const resolvedData = data.map(item => item.resolved);

    const options = {
        chart: { type: 'line', height: '100%', width: '100%', animations: { enabled: false }, toolbar: { show: false } },
        title: { text: title, align: 'left', style: { fontSize: '14px', fontWeight: 'bold' } },
        series: [
            { name: 'Reclamos CREADOS', data: createdData, color: CHART_COLORS.TREND_COLORS.CREATED },
            { name: 'Reclamos RESUELTOS', data: resolvedData, color: CHART_COLORS.TREND_COLORS.RESOLVED }
        ],
        xaxis: { categories: labels, labels: { style: { fontSize: '10px' } } },
        stroke: { width: 3, curve: 'straight' },
        legend: { position: 'bottom', fontSize: '12px' }
    };
    
    const chart = new ApexCharts(targetDiv, options);
    chart.render();
    return chart;
}


/** Genera el código HTML para una tabla. */
export function generateTableHTML(headers, data, title) {
    if (!data || data.length === 0) return '';

    let tableHtml = `<div class="report-section">`;
    if (title) {
        tableHtml += `<h3 class="text-md font-bold mb-2">${title}</h3>`;
    }
    tableHtml += `<table class="report-table"><thead><tr>`;
    headers.forEach(header => {
        tableHtml += `<th>${header}</th>`;
    });
    tableHtml += `</tr></thead><tbody>`;

    data.forEach(row => {
        tableHtml += `<tr>`;
        
        // 🚨 CORRECCIÓN CLAVE: Mapear la data de la fila usando las claves esperadas por el backend
        headers.forEach(header => {
            const headerKey = header.toLowerCase().replace(/\s/g, ''); 
            let dataKey;
            
            // Determinar la clave de la data del backend (rating, name, date, created, resolved)
            if (headerKey === 'rating') dataKey = 'rating';
            else if (headerKey === 'nombre') dataKey = 'name';
            else if (headerKey === 'conteo') dataKey = 'count';
            else if (headerKey === 'fecha') dataKey = 'date';
            else if (headerKey === 'creados') dataKey = 'created';
            else if (headerKey === 'resueltos') dataKey = 'resolved';
            else dataKey = headerKey; 

            // Tomar el valor, incluso si es 0, y evitar errores si es undefined
            const displayValue = row[dataKey] !== undefined ? row[dataKey] : '';
            tableHtml += `<td>${displayValue}</td>`;
        });
        
        tableHtml += `</tr>`;
    });
    tableHtml += `</tbody></table></div>`;
    return tableHtml;
}


// ====================================================================
// FUNCIÓN ORQUESTADORA DE RENDERIZADO
// ====================================================================

export async function renderReportContent() {
    const reportDataString = localStorage.getItem('currentReportData');
    const reportOptionsString = localStorage.getItem('currentReportOptions');
    
    // ... (rest of the logic) ...

    if (!reportDataString || !reportOptionsString) {
        document.getElementById('report-content-area').innerHTML = '<p class="text-center text-red-500">No se encontraron datos de reporte para mostrar. Vuelve a la página principal e inténtalo de nuevo.</p>';
        return;
    }

    const reportData = JSON.parse(reportDataString);
    const reportOptions = JSON.parse(reportOptionsString);

    
    const tablesArea = document.getElementById('report-tables-area');
    const chartsDisplayArea = document.getElementById('charts-display-area');

    if (!tablesArea || !chartsDisplayArea) {
        console.error("Contenedores de reporte (tablesArea/chartsDisplayArea) no encontrados. Verifica el HTML.");
        return;
    }
    tablesArea.innerHTML = '';
    chartsDisplayArea.innerHTML = '';
    let chartCounter = 0; 
    let renderPromises = [];

    // [RENDER HEADER]
    document.getElementById('report-name').textContent = reportOptions.reportKey.replace(/_/g, ' ');
    document.getElementById('report-date').textContent = new Date().toLocaleDateString();
    let paramsText = `Período: ${reportOptions.period}`;
    if (reportOptions.period === 'Personalizado' && reportOptions.dateFrom && reportOptions.dateTo) {
        paramsText += ` (Desde: ${reportOptions.dateFrom} Hasta: ${reportOptions.dateTo})`;
    }
    document.getElementById('report-params').textContent = paramsText;
    
    
    // [RENDER BODY - LÓGICA DE SWITCH CASE]
    switch (reportOptions.reportKey) {
        
        case 'DEMAND_TREND':
            if (reportData.trendData && reportData.trendData.length > 0) {
                tablesArea.innerHTML += generateTableHTML(['Fecha', 'Creados', 'Resueltos'], reportData.trendData, 'Datos de Tendencia de Reclamos');
                chartsDisplayArea.innerHTML += `<div class="chart-item" id="chart-${chartCounter}"></div>`;
                const chartInstance = drawApexLineChartInPreview(reportData.trendData, 'Tendencia de Creación y Cierre de Reclamos', `chart-${chartCounter++}`);
                if (chartInstance && chartInstance.exec && chartInstance.exec.promise ) {
                    renderPromises.push(chartInstance.exec.promise);
                }
            }
            break;

        case 'RISK_SEVERITY':
            if (reportData.severityCounts) {
                tablesArea.innerHTML += generateTableHTML(['Nombre', 'Conteo'], reportData.severityCounts, 'Reclamos por Gravedad');
                chartsDisplayArea.innerHTML += `<div class="chart-item" id="chart-${chartCounter}"></div>`;
                const chartInstance = drawApexChartInPreview(reportData.severityCounts, 'doughnut', 'Proporción de Reclamos por Gravedad', `chart-${chartCounter++}`);
                if (chartInstance && chartInstance.exec && chartInstance.exec.promise) {
                    renderPromises.push(chartInstance.exec.promise);
                }
            }

            if (reportData.recurrenceCounts) {
                tablesArea.innerHTML += generateTableHTML(['Nombre', 'Conteo'], reportData.recurrenceCounts, 'Reclamos por Recurrencia');
                chartsDisplayArea.innerHTML += `<div class="chart-item" id="chart-${chartCounter}"></div>`;
                const chartInstance = drawApexChartInPreview(reportData.recurrenceCounts, 'doughnut', 'Conteo de Reclamos por Recurrencia', `chart-${chartCounter++}`);
                if (chartInstance && chartInstance.exec && chartInstance.exec.promise) {
                    renderPromises.push(chartInstance.exec.promise);
                }
            }
            break;

        case 'CUSTOMER_QUALITY':
            if (reportData.ratingCounts && reportData.ratingCounts.length > 0) {
                tablesArea.innerHTML += generateTableHTML(['Rating', 'Conteo'], reportData.ratingCounts, 'Reclamos por Calificación');
                chartsDisplayArea.innerHTML += `<div class="chart-item" id="chart-${chartCounter}"></div>`;
                const chartInstance = drawApexChartInPreview(reportData.ratingCounts, 'doughnut', 'Proporción de Reclamos por Calificación', `chart-${chartCounter++}`);
                if (chartInstance && chartInstance.exec && chartInstance.exec.promise) {
                    renderPromises.push(chartInstance.exec.promise);
                }
            }
            break;
            
        case 'OPERATIONAL_SUMMARY':
            // 1. Tendencia
            if (reportData.trendData) {
                tablesArea.innerHTML += generateTableHTML(['Fecha', 'Creados', 'Resueltos'], reportData.trendData, 'Datos de Tendencia');
                chartsDisplayArea.innerHTML += `<div class="chart-item" id="chart-${chartCounter}"></div>`;
                const chartInstance = drawApexLineChartInPreview(reportData.trendData, 'Tendencia Creados/Resueltos', `chart-${chartCounter++}`);
                if (chartInstance && chartInstance.exec && chartInstance.exec.promise) { renderPromises.push(chartInstance.exec.promise); }
            }
            // 2. Severidad
            if (reportData.severityCounts) {
                tablesArea.innerHTML += generateTableHTML(['Nombre', 'Conteo'], reportData.severityCounts, 'Reclamos por Gravedad');
                chartsDisplayArea.innerHTML += `<div class="chart-item" id="chart-${chartCounter}"></div>`;
                const chartInstance = drawApexChartInPreview(reportData.severityCounts, 'doughnut', 'Conteo de Reclamos por Gravedad', `chart-${chartCounter++}`);
                if (chartInstance && chartInstance.exec && chartInstance.exec.promise) { renderPromises.push(chartInstance.exec.promise); }
            }
            // 3. Calificación
            if (reportData.ratingCounts) {
                tablesArea.innerHTML += generateTableHTML(['Rating', 'Conteo'], reportData.ratingCounts, 'Reclamos por Calificación');
                chartsDisplayArea.innerHTML += `<div class="chart-item" id="chart-${chartCounter}"></div>`;
                const chartInstance = drawApexChartInPreview(reportData.ratingCounts, 'doughnut', 'Proporción por Calificación', `chart-${chartCounter++}`);
                if (chartInstance && chartInstance.exec && chartInstance.exec.promise) { renderPromises.push(chartInstance.exec.promise); }
            }
            break;
    }
    
    await Promise.all(renderPromises);
    console.log("Gráficos de ApexCharts renderizados completamente en la vista previa.");
}

/** Maneja la descarga del PDF usando html2pdf.js. */
export function downloadReportPDF() {
    // ... (Code for downloadReportPDF) ...
    const element = document.getElementById('report-content-area');
    const filename = `reporte-${document.getElementById('report-name').textContent.replace(/\s/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`;

    const options = {
        margin: 10,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Ocultar el botón de descarga antes de generar el PDF
    const downloadBtn = document.getElementById('download-pdf-btn');
    if (downloadBtn) downloadBtn.style.display = 'none';

    html2pdf().set(options).from(element).save().then(() => {
        // Mostrar el botón de descarga de nuevo al finalizar
        if (downloadBtn) downloadBtn.style.display = 'block';
    });
}