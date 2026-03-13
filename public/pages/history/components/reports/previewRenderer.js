const CHART_COLORS = {
    GRAVITY_COLORS: ['#10B981', '#F59E0B', '#EF4444', '#84CC16'], 
    RATING_COLORS: ['#EF4444','#3B82F6' ,'#FACC15', '#84CC16', '#10B981'], 
    TREND_COLORS: {
        CREATED: '#3B82F6', 
        RESOLVED: '#10B981', 
    }
};

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
    const isHorizontalBar = chartType === 'bar'; 
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
export function drawBarChart(data, title, targetDivId, isHorizontal = true) {
    const targetDiv = document.getElementById(targetDivId);
    if (!targetDiv || !data || data.length === 0) return null;

    targetDiv.innerHTML = ''; // Limpiar contenedor

    // Extraer datos
    const labels = data.map(item => item.name || item.label || 'Sin Nombre');
    const values = data.map(item => item.count || item.value || 0);

    const options = {
        series: [{
            name: 'Cantidad',
            data: values
        }],
        chart: {
            type: 'bar', // En ApexCharts, 'bar' se usa tanto para barras como columnas
            height: 350,
            width: '100%',
            animations: { enabled: false }, // CRUCIAL para html2pdf
            toolbar: { show: false }
        },
        plotOptions: {
            bar: {
                horizontal: isHorizontal, // Aquí defines si es Barra o Columna
                columnWidth: '50%',
                borderRadius: 4,
                distributed: true, // ¡Truco! Esto da un color diferente a cada barra (se ve mejor)
                dataLabels: {
                    position: 'top', // Pone el número al final de la barra
                },
            }
        },
        dataLabels: {
            enabled: true,
            formatter: function (val) {
                return val; // Muestra el número exacto
            },
            offsetY: -20, // Ajuste para que no tape la barra
            style: {
                fontSize: '12px',
                colors: ["#304758"]
            }
        },
        legend: {
            show: false // Ocultamos la leyenda porque ya tenemos etiquetas en los ejes
        },
        xaxis: {
            categories: labels,
            position: 'bottom',
            labels: {
                style: {
                    fontSize: '11px' // Fuente más pequeña si hay muchos nombres
                },
                rotate: isHorizontal ? 0 : -45 // Rotar texto si son columnas verticales para que quepan
            }
        },
        yaxis: {
            axisBorder: { show: false },
            axisTicks: { show: false },
            labels: { show: !isHorizontal } // Ocultar eje Y si es horizontal para limpiar visualmente
        },
        title: {
            text: title,
            align: 'left',
            style: { fontSize: '14px', fontWeight: 'bold', color: '#333' }
        },
        colors: [
            '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
            '#EC4899', '#6366F1', '#14B8A6', '#F97316', '#0EA5E9'
        ] // Paleta de colores variada
    };

    const chart = new ApexCharts(targetDiv, options);
    chart.render();
    return chart;
}
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
export function drawMinMaxGaugeChart(min, avg, max, title, targetDivId) {
    const targetDiv = document.getElementById(targetDivId);
    if (!targetDiv || avg === null || avg === undefined) return null;

    targetDiv.innerHTML = '';

    // Evitamos división por cero si max y min son iguales
    let percentage = 0;
    if (max > min) {
        // Fórmula para convertir un valor dentro de un rango a porcentaje (0-100)
        percentage = ((avg - min) / (max - min)) * 100;
    } else if (max === min && max > 0) {
        percentage = 100;
    }

    const options = {
        series: [percentage],
        chart: {
            height: 350,
            type: 'radialBar',
            animations: { enabled: false }, // Vital para html2pdf
            toolbar: { show: false }
        },
        plotOptions: {
            radialBar: {
                startAngle: -90, // Lo hacemos un semicírculo perfecto (tipo medidor de tanque)
                endAngle: 90,
                hollow: {
                    margin: 15,
                    size: '60%',
                },
                track: {
                    background: '#e7e7e7',
                    strokeWidth: '100%',
                },
                dataLabels: {
                    show: true,
                    name: {
                        offsetY: 25,
                        show: true,
                        color: '#666',
                        fontSize: '13px',
                        formatter: function() {
                            // Mostramos los límites inferior y superior debajo del promedio
                            return `Min: ${min.toFixed(1)} hs | Max: ${max.toFixed(1)} hs`;
                        }
                    },
                    value: {
                        offsetY: -10,
                        color: '#111',
                        fontSize: '30px',
                        show: true,
                        formatter: function () {
                            // En el centro exacto mostramos el promedio real
                            return avg.toFixed(2) + " hs";
                        }
                    }
                }
            }
        },
        fill: {
            colors: ['#3B82F6'] // Azul para mantener la coherencia visual
        },
        stroke: {
            lineCap: 'round'
        },
        labels: ['Rango'], // Esta prop es obligatoria aunque la sobrescribamos en el formatter
        title: {
            text: title,
            align: 'center',
            style: { fontSize: '15px', fontWeight: 'bold' }
        }
    };

    const chart = new ApexCharts(targetDiv, options);
    chart.render();
    return chart;
}

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
        
        headers.forEach(header => {
            const headerKey = header.toLowerCase().replace(/\s/g, ''); 
            let dataKey;

            // Mapeo actualizado para incluir las nuevas llaves
            if (headerKey === 'rating') dataKey = 'rating';
            else if (headerKey === 'nombre') dataKey = 'name';
            else if (headerKey === 'conteo') dataKey = 'count';
            else if (headerKey === 'fecha') dataKey = 'date';
            else if (headerKey === 'creados') dataKey = 'created';
            else if (headerKey === 'resueltos') dataKey = 'resolved';
            else if (headerKey === 'cliente') dataKey = 'clientName';
            else if (headerKey === 'totalreclamos') dataKey = 'totalClaims';
            else dataKey = headerKey; // Para promedio, minimo, maximo que mapearemos exacto

            const displayValue = row[dataKey] !== undefined ? row[dataKey] : '';
            tableHtml += `<td>${displayValue}</td>`;
        });
        
        tableHtml += `</tr>`;
    });
    tableHtml += `</tbody></table></div>`;
    return tableHtml;
}

export async function renderReportContent() {
    const reportDataString = localStorage.getItem('currentReportData');
    const reportOptionsString = localStorage.getItem('currentReportOptions');

 

    const reportData = JSON.parse(reportDataString);
    const reportOptions = JSON.parse(reportOptionsString);

    const tablesArea = document.getElementById('report-tables-area');
    const chartsDisplayArea = document.getElementById('charts-display-area');

    if (!tablesArea || !chartsDisplayArea) return;

    tablesArea.innerHTML = '';
    chartsDisplayArea.innerHTML = '';
    let chartCounter = 0; 
    let renderPromises = [];

    document.getElementById('report-name').textContent = reportOptions.reportKey.replace(/_/g, ' ');
    document.getElementById('report-date').textContent = new Date().toLocaleDateString();
    let paramsText = ` ${reportOptions.period}`;
    if (reportOptions.period === 'Personalizado' && reportOptions.dateFrom && reportOptions.dateTo) {
        paramsText += ` Desde: ${reportOptions.dateFrom} Hasta: ${reportOptions.dateTo}`;
    }
    document.getElementById('report-params').textContent = paramsText;
    
    // Función auxiliar para renderizar gráfico y guardar promesa
    const renderChart = (chartInstance) => {
        if (chartInstance && chartInstance.exec && chartInstance.exec.promise) {
            renderPromises.push(chartInstance.exec.promise);
        }
    };

    switch (reportOptions.reportKey) {
        
        case 'TENDENCIA_Y_DEMANDA':
           if (reportData.trendData && reportData.trendData.length > 0) {
                tablesArea.innerHTML += generateTableHTML(['Fecha', 'Creados', 'Resueltos'], reportData.trendData, 'Datos de Tendencia de Reclamos');
                chartsDisplayArea.innerHTML += `<div class="chart-item" id="chart-${chartCounter}"></div>`;
                const chartInstance = drawApexLineChartInPreview(reportData.trendData, 'Tendencia de Creación y Cierre de Reclamos', `chart-${chartCounter++}`);
                if (chartInstance && chartInstance.exec && chartInstance.exec.promise ) {
                    renderPromises.push(chartInstance.exec.promise);
                }
            }
            break;

        case 'RIESGO_Y_CALIDAD':
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

        case 'SATIFACCION_DEL_CLIENTE':
            if (reportData.ratingCounts && reportData.ratingCounts.length > 0) {
                tablesArea.innerHTML += generateTableHTML(['Rating', 'Conteo'], reportData.ratingCounts, 'Reclamos por Calificación');
                chartsDisplayArea.innerHTML += `<div class="chart-item" id="chart-${chartCounter}"></div>`;
                const chartInstance = drawApexChartInPreview(reportData.ratingCounts, 'doughnut', 'Proporción de Reclamos por Calificación', `chart-${chartCounter++}`);
                if (chartInstance && chartInstance.exec && chartInstance.exec.promise) {
                    renderPromises.push(chartInstance.exec.promise);
                }
            }
            break;

        case 'DISTRIBUCION_POR_TIPO':
            if (reportData.typeCounts && reportData.typeCounts.length > 0) {
                tablesArea.innerHTML += generateTableHTML(['Nombre', 'Conteo'], reportData.typeCounts, 'Reclamos por Tipo');
                chartsDisplayArea.innerHTML += `<div class="chart-item" id="chart-${chartCounter}"></div>`;
                const chartInstance = drawApexChartInPreview(reportData.typeCounts, 'doughnut', 'Proporción por Distribucion de Tipos', `chart-${chartCounter++}`);
                if (chartInstance && chartInstance.exec && chartInstance.exec.promise) {
                    renderPromises.push(chartInstance.exec.promise);
                }
            }
            break;

        case 'ESTADO_ACTUAL':
            if (reportData.stateDistribution && reportData.stateDistribution.length > 0) {
                const stateNames = { 0: 'Pendiente', 1: 'En Proceso', 2: 'Resuelto' }; 
                const mappedStates = reportData.stateDistribution.map(d => ({
                    name: stateNames[d.state] || `Estado ${d.state}`,
                    count: d.count
                }));

                tablesArea.innerHTML += generateTableHTML(['Nombre', 'Conteo'], mappedStates, 'Distribución de Estados');
                chartsDisplayArea.innerHTML += `<div class="chart-item" id="chart-${chartCounter}"></div>`;
                const chartInstance = drawApexChartInPreview(mappedStates,'doughnut', 'Volumen por Estado Actual', `chart-${chartCounter++}`);
                if (chartInstance && chartInstance.exec && chartInstance.exec.promise) {
                    renderPromises.push(chartInstance.exec.promise);
                }
            }
            break;

        case 'TOP_CLIENTES':
            if (reportData.topClients && reportData.topClients.length > 0) {
                tablesArea.innerHTML += generateTableHTML(['Cliente', 'Total Reclamos'], reportData.topClients, 'Top 10 Clientes con Más Reclamos');
                chartsDisplayArea.innerHTML += `<div class="chart-item" id="chart-${chartCounter}"></div>`;

                const mappedClients = reportData.topClients.map(c => ({ name: c.clientName, count: c.totalClaims }));
                const chartInstance = drawBarChart(mappedClients, 'Top Clientes Problemáticos', `chart-${chartCounter++}`, false);
               if (chartInstance && chartInstance.exec && chartInstance.exec.promise) {
                    renderPromises.push(chartInstance.exec.promise);
                }
            }
            
            break;

       case 'TIEMPO_RESOLUCION':
          if (reportData.resolutionTime && reportData.resolutionTime.length > 0) {
                const rt = reportData.resolutionTime[0];
      
                // 1. Renderizamos la tabla (Mantenemos la que ya tienes)
                const formattedData = [{
                    promedio: rt.avgResolutionTimeHours ? `${rt.avgResolutionTimeHours.toFixed(2)} hs` : '0 hs',
                    minimo: rt.minResolutionTime ? `${rt.minResolutionTime.toFixed(2)} hs` : '0 hs',
                    maximo: rt.maxResolutionTime ? `${rt.maxResolutionTime.toFixed(2)} hs` : '0 hs'
                }];
                tablesArea.innerHTML += generateTableHTML(['Promedio', 'Minimo', 'Maximo'], formattedData, 'Métricas de Tiempo de Resolución (En Horas)');

                // 2. Renderizamos el Gráfico Gauge Dinámico
                if (rt.avgResolutionTimeHours !== undefined) {
                    chartsDisplayArea.innerHTML += `<div class="chart-item" id="chart-${chartCounter}"></div>`;
                    
                    // Aseguramos que los valores sean números (por si alguno viene null)
                    const min = rt.minResolutionTime || 0;
                    const max = rt.maxResolutionTime || 0;
                    const avg = rt.avgResolutionTimeHours || 0;

                    const chartInstance = drawMinMaxGaugeChart(
                        min, 
                        avg, 
                        max,
                        'Promedio entre el Mínimo y Máximo Histórico', 
                        `chart-${chartCounter++}`
                    );

                    if (chartInstance && chartInstance.exec && chartInstance.exec.promise) {
                        renderPromises.push(chartInstance.exec.promise);
                    }
                }
            }
            break;

    }
    
    await Promise.all(renderPromises);
    console.log("Gráficos de ApexCharts renderizados completamente en la vista previa.");
}

export function downloadReportPDF() {
    const element = document.getElementById('report-content-area');
    const filename = `reporte-${document.getElementById('report-name').textContent.replace(/\s/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`;

    const options = {
        margin: 10,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    const downloadBtn = document.getElementById('download-pdf-btn');
    if (downloadBtn) downloadBtn.style.display = 'none';

    html2pdf().set(options).from(element).save().then(() => {
        if (downloadBtn) downloadBtn.style.display = 'block';
    });
}