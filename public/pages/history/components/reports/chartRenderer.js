let APEX_CHART_INSTANCES = new Map();
let HIDDEN_RENDER_DIV = null;

const CHART_COLORS = {
    GRAVITY_COLORS: ['#10B981', '#F59E0B', '#EF4444'], 
    RATING_COLORS: ['#EF4444', '#F97316', '#FACC15', '#84CC16', '#10B981'], 
    TREND_COLORS: {
        CREATED: '#3B82F6', 
        RESOLVED: '#10B981',
    }
};


function getHiddenRenderDiv(idBase) {
    if (!HIDDEN_RENDER_DIV) {
        HIDDEN_RENDER_DIV = document.createElement('div');
        HIDDEN_RENDER_DIV.id = 'apex-hidden-render-area';

        HIDDEN_RENDER_DIV.style.position = 'fixed'; 
        HIDDEN_RENDER_DIV.style.top = '-9999px';
        HIDDEN_RENDER_DIV.style.left = '-9999px';
        HIDDEN_RENDER_DIV.style.width = '800px'; 
        HIDDEN_RENDER_DIV.style.height = '400px';
        
        document.body.appendChild(HIDDEN_RENDER_DIV);
    }
    
    HIDDEN_RENDER_DIV.innerHTML = `<div id="${idBase}" style="width: 100%; height: 100%;"></div>`;
    return HIDDEN_RENDER_DIV.querySelector(`#${idBase}`);
}

function drawApexChart(data, chartType, title, idBase) {
    if (!data || data.length === 0) return null;

    const targetDiv = getHiddenRenderDiv(idBase);
    
    const isRatingChart = title.includes('Calificación');
    const isPieChart = chartType === 'doughnut'; 
    
    const labels = data.map(item => item.name || `Rating ${item.rating}`);
    const counts = data.map(item => item.count);
    
    const colors = isRatingChart ? CHART_COLORS.RATING_COLORS : CHART_COLORS.GRAVITY_COLORS;

    const options = {
        chart: {
            type: isPieChart ? 'donut' : 'bar',
            width: '100%', 
            height: '100%',
            animations: { enabled: false }, 
            toolbar: { show: false }
        },
        title: { text: title, align: 'left' },
        series: isPieChart ? counts : [{ name: 'Conteo', data: counts }],
        labels: isPieChart ? labels : undefined,
        xaxis: isPieChart ? undefined : { categories: labels, labels: { style: { fontSize: '10px' } } },
        plotOptions: { 
            bar: { horizontal: !isPieChart, columnWidth: '55%' },
            pie: { donut: { size: '65%' } }
        },
        colors: colors,
        legend: { position: 'bottom' }
    };

    const chart = new ApexCharts(targetDiv, options);
    chart.render(); 

    APEX_CHART_INSTANCES.set(idBase, chart); 
    return chart; 
}

function drawApexLineChart(data, title, idBase) {
    if (!data || data.length === 0) return null;
    
    const targetDiv = getHiddenRenderDiv(idBase);
    
    const labels = data.map(item => item.date);
    const createdData = data.map(item => item.created);
    const resolvedData = data.map(item => item.resolved);

    const options = {
        chart: {
            type: 'line',
            width: '100%',
            height: '100%',
            animations: { enabled: false },
            toolbar: { show: false }
        },
        title: { text: title, align: 'left' },
        series: [
            { name: 'Reclamos CREADOS', data: createdData, color: CHART_COLORS.TREND_COLORS.CREATED },
            { name: 'Reclamos RESUELTOS', data: resolvedData, color: CHART_COLORS.TREND_COLORS.RESOLVED }
        ],
        xaxis: { categories: labels },
        stroke: { width: 3, curve: 'straight' },
        legend: { position: 'bottom' }
    };
    
    const chart = new ApexCharts(targetDiv, options);
    chart.render();
    
    APEX_CHART_INSTANCES.set(idBase, chart); 
    return chart;
}


function drawAllCharts(reportKey, reportData) {
    const chartsToExport = [];

    APEX_CHART_INSTANCES.forEach(chart => chart.destroy());
    APEX_CHART_INSTANCES.clear();

    switch (reportKey) {
        case 'DEMAND_TREND':
            chartsToExport.push({ 
                instance: drawApexLineChart(reportData.trendData, 'Tendencia de Creación y Cierre de Reclamos', 'trend1') 
            });
            break;
        
        case 'RISK_SEVERITY':
            chartsToExport.push({ 
                instance: drawApexChart(reportData.severityCounts, 'donut', 'Proporción de Reclamos por Gravedad', 'severity1') 
            });
            chartsToExport.push({ 
                instance: drawApexChart(reportData.recurrenceCounts, 'bar', 'Conteo de Reclamos por Recurrencia', 'recurrence1') 
            });
            break;
            
        case 'CUSTOMER_QUALITY':
            chartsToExport.push({ 
                instance: drawApexChart(reportData.ratingCounts, 'donut', 'Proporción de Reclamos por Calificación', 'rating1') 
            });
            break;
        
        case 'OPERATIONAL_SUMMARY':
            chartsToExport.push({ instance: drawApexLineChart(reportData.trendData, 'Tendencia de Creación y Cierre de Reclamos', 'trend2') });
            chartsToExport.push({ instance: drawApexChart(reportData.severityCounts, 'bar', 'Conteo de Reclamos por Gravedad', 'severity2') });
            chartsToExport.push({ instance: drawApexChart(reportData.ratingCounts, 'donut', 'Proporción de Reclamos por Calificación', 'rating2') });
            break;
    }

    return chartsToExport.filter(c => c.instance !== null);
}

function destroyAndClear() {
    APEX_CHART_INSTANCES.forEach(chart => chart.destroy());
    APEX_CHART_INSTANCES.clear();
}


export const renderCharts = {
    drawAllCharts,
    destroyAllCharts: destroyAndClear,
    getInstances: () => APEX_CHART_INSTANCES 
};