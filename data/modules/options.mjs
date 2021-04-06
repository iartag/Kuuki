export function getLineChartInformations(label) {
    let gradient = null;
    return {
        labels: [],
        datasets: [
            {
                label: label,
                borderColor: function(context) {
                    let chartArea = context.chart.chartArea;

                    if (!chartArea) {
                        return null;
                    }

                    let chartWidth = chartArea.right - chartArea.left;
                    let chartHeight = chartArea.bottom - chartArea.top;
                    if (gradient === null || width !== chartWidth || height !== chartHeight) {
                        // Create the gradient because this is either the first render
                        // or the size of the chart has changed
                        width = chartWidth;
                        height = chartHeight;
                        let ctx = context.chart.ctx;
                        gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                        gradient.addColorStop(0, cssVar('green'));
                        gradient.addColorStop(0.5, cssVar('orange'));
                        gradient.addColorStop(1, cssVar('red'));
                    }

                    return gradient;
                },
                borderWidth: 2,
                data: []
            }
        ]
    }
};

export function getLineChartOptions(unit) {
    return {
        elements: {
            point:{
                radius: 0
            }
        },
        scales: {
            xAxes: [{
                type: 'time',
                time: {
                    tooltipFormat: 'HH:mm, DD.MM.YYYY',
                    minUnit: 'second',
                    displayFormats: {
                        second: 'HH:mm:ss',
                        minute: 'HH:mm',
                        hour: 'HH:mm'
                    },
                    isoWeekday: true
                }
            }]
        },
        tooltips: {
            callbacks: {
                label: item => `${item.yLabel} ${unit}`
            }
        },
        responsive: true,
        responsiveAnimationDuration: 400,
        maintainAspectRatio: false
    
    };
};

export function getGaugeChartOptions() {
    return {
        angle: 0.15, // The span of the gauge arc
        lineWidth: 0.3, // The line thickness
        radiusScale: 1, // Relative radius
        pointer: {
            length: 0.5, // Relative to gauge radius
            strokeWidth: 0.045, // The thickness
            color: cssVar('fontColor') // Fill color
        },
        limitMax: true,     // If false, max value increases automatically if value > maxValue
        limitMin: true,     // If true, the min value of the gauge will be fixed
        strokeColor: '#E0E0E0',  // to see which ones work best for you
        generateGradient: true,
        highDpiSupport: true,     // High resolution support
    } 
};


export function getDetailedGaugeChartOptions(prop) {
    let detailedGaugeChartOptions = {
        co2: {
            staticZones: [
                {strokeStyle: cssVar('green'), min: virusIndexSettings.co2.gaugeMin, max: virusIndexSettings.co2.good},
                {strokeStyle: cssVar('orange'), min: virusIndexSettings.co2.good + 1, max: virusIndexSettings.co2.ok},
                {strokeStyle: cssVar('red'), min: virusIndexSettings.co2.ok + 1, max: virusIndexSettings.co2.gaugeMax}
                
            ],
            staticLabels: {
                font: "0.8em sans-serif",
                labels: [virusIndexSettings.co2.gaugeMin, virusIndexSettings.co2.good, virusIndexSettings.co2.ok, virusIndexSettings.co2.gaugeMax],
                color: cssVar('fontColor'),
                fractionDigits: 0
            }
        },
        temperature: {
            staticZones: [
                {strokeStyle: cssVar('red'), min: virusIndexSettings.temperature.gaugeMin, max: virusIndexSettings.temperature.badBelow},
                {strokeStyle: cssVar('orange'), min: virusIndexSettings.temperature.badBelow, max: virusIndexSettings.temperature.goodBelow},
                {strokeStyle: cssVar('green'), min: virusIndexSettings.temperature.goodBelow, max: virusIndexSettings.temperature.goodAbove},
                {strokeStyle: cssVar('orange'), min: virusIndexSettings.temperature.goodAbove, max: virusIndexSettings.temperature.okAbove},
                {strokeStyle: cssVar('red'), min: virusIndexSettings.temperature.okAbove, max: virusIndexSettings.temperature.gaugeMax}
                
            ],
            staticLabels: {
                font: "0.8em sans-serif",
                labels: [
                    virusIndexSettings.temperature.gaugeMin,
                    virusIndexSettings.temperature.badBelow,
                    virusIndexSettings.temperature.goodBelow,
                    virusIndexSettings.temperature.goodAbove,
                    virusIndexSettings.temperature.okAbove,
                    virusIndexSettings.temperature.gaugeMax],
                    color: cssVar('fontColor'),
                    fractionDigits: 0.1
                }
        },
        humidity: {
            staticZones: [
                {strokeStyle: cssVar('red'), min: virusIndexSettings.humidity.gaugeMin, max: virusIndexSettings.humidity.badBelow},
                {strokeStyle: cssVar('orange'), min: virusIndexSettings.humidity.badBelow, max: virusIndexSettings.humidity.goodBelow},
                {strokeStyle: cssVar('green'), min: virusIndexSettings.humidity.goodBelow, max: virusIndexSettings.humidity.goodAbove},
                {strokeStyle: cssVar('orange'), min: virusIndexSettings.humidity.goodAbove, max: virusIndexSettings.humidity.okAbove},
                {strokeStyle: cssVar('red'), min: virusIndexSettings.humidity.okAbove, max: virusIndexSettings.humidity.gaugeMax}
                
            ],
            staticLabels: {
                font: "0.8em sans-serif",
                labels: [
                    virusIndexSettings.humidity.gaugeMin,
                    virusIndexSettings.humidity.badBelow,
                    virusIndexSettings.humidity.goodBelow,
                    virusIndexSettings.humidity.goodAbove,
                    virusIndexSettings.humidity.okAbove,
                    virusIndexSettings.humidity.gaugeMax
                ],
                color: cssVar('fontColor'),
                fractionDigits: 0.1
            }
        }
    } 

    return {...getGaugeChartOptions(), ...detailedGaugeChartOptions[prop]}
};