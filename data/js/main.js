
// import * as config from '/config.json';
// import * as chartOptions from '/modules/options.mjs';


let stationIP = "192.168.178.147";
// let stationIP = "192.168.1.1";
// let stationIP = "192.168.4.35";
// let stationIP = "192.168.43.98";
const tempURL = window.location.protocol == 'file:' ? 'http://' + stationIP : '';

let lineCharts, gaugeCharts, config;

async function setup() {
    let formNetwork = document.forms["networkConfig"];
    let formSensor = document.forms["sensorConfig"];
    let checkboxConnect = document.querySelector('#newConnect');
    let buttonNetwork = document.querySelector('#configNetwork');
    let buttonSensor = document.querySelector('#configSensor');

    window.addEventListener("resize", () => {
        for(let i in lineCharts) {
            lineCharts[i].resize();
        }
    });

    checkboxConnect.addEventListener('click', (event) => {
        console.log(event)
        if(event.target.checked) {
            event.target.value = 'true'
            event.target.setAttribute('checked', '')
        } else {
            event.target.value = 'false'
            event.target.removeAttribute('checked')
        }
    })

    buttonNetwork.addEventListener('click', () => {
        if (formNetwork.classList.toggle('retracted') == false) {
            buttonNetwork.classList.toggle('active', true);
            formNetwork['ssid'].focus();
            configNetwork();
        } else {
            buttonNetwork.classList.toggle('active', false);
            buttonNetwork.blur();
        }
    })

    buttonSensor.addEventListener('click', () => {
        if (formSensor.classList.toggle('retracted') == false) {
            buttonSensor.classList.toggle('active', true);
        } else {
            buttonSensor.classList.toggle('active', false);
            buttonSensor.blur();
        }
    })

    formNetwork.addEventListener('submit', (event) => {
        event.preventDefault();
        let fields = [].slice.call(formNetwork.elements, 0);
        let fieldObject = {};
        fields.forEach((elem) => {
            if(!elem.name ||
                new Set(["submit"]).has(elem.name) ||
                elem.type === 'file') {
                    return;
            }
            fieldObject[elem.name] = elem.value;
        })
    
        changeNetwork(fieldObject);
    });

    formSensor.addEventListener('submit', (event) => {
        event.preventDefault();
        let fields = [].slice.call(formSensor.elements, 0);
        let fieldObject = {};
        fields.forEach((elem) => {
            if(!elem.name ||
                new Set(["submit"]).has(elem.name) ||
                elem.type === 'file') {
                    return;
            }
            fieldObject[elem.name] = elem.value;
        })

        saveSensorConfig(fieldObject)
    });

    try {
        const response = await fetch(tempURL + '/config.json');
        const data = await response.json();
        config = data;

        document.querySelector('#pageTitle').innerHTML = document.title = config.sensorName + ' Dashboard';

        lineCharts = config.properties;
        gaugeCharts = [...lineCharts];

        config.properties.forEach(prop => {
            let div = document.createElement('div');
            div.id = prop + 'Current';
            div.classList.add('currentContainer');
            let title = document.createElement('h2');
            title.id = prop + 'Title';
            title.classList.add('titleContainer');
            title.innerHTML = getPrettyName(prop);
            document.querySelector('#sensorData').appendChild(div).appendChild(title);
        });

        collectNetworkInfo();
        initLineCharts();
        initGaugeCharts();
        let current = await readData('entry=current');
        gaugeCharts.forEach(chart => chart.set(current[chart.label]))
        
        if(await displayAllDataEntries('buffer')) {
            setTimeout(configNetwork, 500);
        
            setInterval(async () => {
                addDatasetToCharts(await readData('entry=current'))
            }, config.sensor.readInterval * 1000);
        }

    } catch (err) {
        changeStatus({connectionStatus: 8});
        return console.error(err);
    }

};

const cssVar = (name, value) => {
    if(name.substr(0, 2) !== "--") 
        name = "--" + name;

    if(value)
        document.documentElement.style.setProperty(name, value)

    return getComputedStyle(document.documentElement).getPropertyValue(name);
};

function setColor(r = 0, g = 0, b = 0) {
    if(r == 'red') {
        setColor(255);
        return;
    } else if(r == 'green') {
        setColor(0, 255);
        return;
    } else if(r = 'blue') {
        setColor(0,0,255);
        return;
    }

    fetch(`${tempURL}/led?r=${r}&g=${g}&b=${b}`)
        .then(response => console.log(response));
}

function changeStatus(data) {

    let indicator = document.querySelector('#connectionIndicator');
    let ssid = document.querySelector("#ssid")
    let networkText = document.querySelector("#networkText")
    let ip = document.querySelector("#ip")
    let ipText = document.querySelector("#ipText")
    indicator.className = '';

    if(data.connectionStatus == 3) {
        networkText.innerHTML = 'Connected to network';
        indicator.classList.add('success');
        ssid.innerHTML = data.ssid;
        ip.innerHTML = stationIP = data.localIP;
        [ssid, networkText, ipText, ip].forEach(elem => elem.classList.remove('hidden'));
    } else if(data.connectionStatus == 0 || data.ssid == '') {
        indicator.classList.add('error');
        networkText.innerHTML = 'Not connected to any network';
        ssid.innerHTML = '';
        ip.innerHTML = '';
        [ssid, ipText, ip].forEach(elem => elem.classList.add('hidden'));
    } else if(data.connectionStatus == 9 ) { // custom connection status code! 9 == "wlan credentials stored"
        console.log('Credentials stored successfully')
    } else if(data.connectionStatus == 8 ) { // custom connection status code! 8 == "sensor inaccessible"
        indicator.classList.add('error');
        networkText.innerHTML = 'AirSensor inaccessible';
        ssid.innerHTML = '';
        ip.innerHTML = '';
        [ssid, ipText, ip].forEach(elem => elem.classList.add('hidden'));
    } else if(data.connectionStatus == 7) { // custom connection status code! 7 == "connecting"
        networkText.innerHTML = 'Trying to connect to network';
        ssid.innerHTML = data.ssid;
        ssid.classList.remove('hidden');     
    } else {
        indicator.classList.add('error');
        networkText.innerHTML = 'ConnectionStatus not handled: ' + data;
        stationIP = data.localIP;
        ssid.innerHTML = data.ssid;
        ssid.classList.remove('hidden');
        ip.innerHTML = data.localIP;
        ip.classList.remove('hidden');
    }
    
    let wifiMode = document.querySelector("#wifiMode");
    switch (data.wifiMode) {
        case 1:
            wifiMode.innerHTML = "wifi.STATION";
            break;
        case 2:
            wifiMode.innerHTML = "wifi.SOFTAP";
            break;
        case 3:
            wifiMode.innerHTML = "wifi.STATIONAP";
            break;  
        case 4:
            wifiMode.innerHTML = "wifi.NULLMODE";
            break;
    }
}

function parameterize(fields) {
    let parameters = [];
    for (const [key, value] of Object.entries(fields)) {
        parameters.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
    return parameters.join('&');
}

function collectNetworkInfo() {
    fetch(tempURL + '/networkInfo', {
        headers: {
            'Accept': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => changeStatus(data));
};

async function changeNetwork(fields) {
    let change = true;
    if(config.softAccessPointSettings.ip != window.location.host && fields.connect == 'true') {
        change = confirm(`Sensor will no longer be accessible via ${window.location.host}!`);
    }
    
    if(change) {
        changeStatus({connectionStatus: 7, ssid: fields.ssid})
        
        const response = await fetch(tempURL + '/changeNetwork?' + parameterize(fields), {
            headers: {
                'Accept': 'application/json'
            }
        })
        const data = await response.json();
        changeStatus(data);

    }
};

async function detectNetwork() {
        return fetch(tempURL + '/detectNetwork', {
            headers: {
                'Accept': 'application/json'
            }
        })
};

async function configNetwork() {
    let networkDatalist = document.querySelector("datalist#networks > select");

    const response = await detectNetwork();
    const data = await response.json();

    networkDatalist.innerHTML = "";
    data.forEach(network => {
        option = document.createElement("option");
        option.setAttribute("value", network.ssid);
        option.innerHTML = network.ssid;
        networkDatalist.append(option);
    });

};

async function saveSensorConfig(fields) {
    console.log(fields);
    let parameters = parameterize(fields);
    const request = await fetch(tempURL + '/updateSensorConfig?' + parameters);
    const data = await request.json()
    console.log(data)
}

async function readData(parameters = '') {
    const response = await fetch(tempURL + '/readData?' + parameters, {
        headers: {
            'Accept': 'application/json'
        }
    });
    return await response.json();
};

async function displayAllDataEntries(entry = 'all', display = true)  {
    let currentTime = new Date();
    const response = await fetch(tempURL + '/readData?entry=' + entry);
    const buffer = await response.arrayBuffer();

    const view = new StreamingDataView(buffer);
    let header = {
        alive: view.getUint32(true),
        dataSetSize: view.getUint16(true),
        headerSize: view.getUint8(),
        sensorReadInterval: view.getUint8() * 1000,
        dataHistory: view.getUint8()* 60 * 60 * 1000
    };

    let elem = document.querySelector('#aliveSince');
    elem.setAttribute('data-alive', header.alive);
    elem.innerHTML = Math.floor(header.alive / 1000) + ' seconds';

    view.setPosition(header.headerSize);

    let timestamp = currentTime - Math.min(header.alive, header.dataHistory);

    for(let i = 0; view.position < buffer.byteLength-header.dataSetSize; i++) {
        let startPosition = view.position;
        let struct = {
            temperature: view.getFloat32(true).toFixed(2),
            humidity: view.getFloat32(true).toFixed(2),
            co2: view.getUint16(true),
            index: view.getUint8(),
        }
        
        if(display) {
            lineCharts.forEach(chart => {
                chart.data.labels.push(new Date(timestamp));
                chart.data.datasets[0].data.push(struct[chart.label]);
            });

        }

        timestamp += header.sensorReadInterval;
        view.setPosition(startPosition + header.dataSetSize);
        
    }

    lineCharts.forEach(chart => {
        chart.update();
    });
    return true;
}

function addDatasetToCharts(entry, timestamp = undefined) {
    if(!timestamp) {
        timestamp = Date.now();
        gaugeCharts.forEach(chart => chart.set(entry[chart.label]));
    }

    lineCharts.forEach(chart => {
        chart.data.labels.push(new Date(timestamp));
        chart.data.datasets[0].data.push(entry[chart.label]);
        chart.update();
    });
};

function getUnit(prop) {
    switch(prop) {
        case 'co2':
            return 'PPM';
        case 'temperature':
            return '\u00B0C';

        case 'humidity':
            return 'RH';
        default:
            return '';
    };
};

function getPrettyName(prop) {
    return prop == 'co2' ? 'CO\u2082' : prop.charAt(0).toUpperCase() + prop.slice(1);
}

function initLineCharts() {
    Chart.defaults.global.tooltips.intersect = false;
    Chart.defaults.global.legend.display = false;
    Chart.defaults.global.defaultFontColor = cssVar('fontColor');

    return lineCharts = lineCharts.map(prop => {
        let div = document.createElement('div');
        div.classList.add('lineChartContainer');
        let canvas = document.createElement('canvas');
        canvas.id = prop + 'LineChart';
        document.querySelector('#' + prop + 'Current').insertAdjacentElement('afterend', div).appendChild(canvas);
        let label = getPrettyName(prop);

        let yAxes = prop != 'index' ? '' : [{
            ticks: {
                min: 1,
                max: 10
            }
        }]

        let line = {
            tension: prop == 'index' ? 0 : 0.4
        }
    
        canvas.getContext('2d');
        let chart = new Chart(canvas, {
            type: 'line',
            data: chartOptions.getLineChartInformations(label),
            options: chartOptions.getLineChartOptions(getUnit(prop), yAxes, line)
        })
        
        chart.label = prop;
        chart.update();
        return chart;
    });
};

function initGaugeCharts() {
    return gaugeCharts = gaugeCharts.map(prop => {
    
        let textField = document.createElement('p');
        textField.classList.add('gaugeTextField');
        textField.innerHTML = `<span id="${prop}TextField"></span> ${getUnit(prop)}`;
    
        let canvas = document.createElement('canvas');
        canvas.id = prop + 'GaugeChart';
    
        let elem = document.querySelector('#' + prop + 'Current');
        elem.appendChild(textField);
        elem.appendChild(canvas);
    
        let chart = new Gauge(canvas).setOptions(chartOptions.getDetailedGaugeChartOptions(prop));
        if(prop == 'temperature' || prop == 'humidity') {
            chart.setTextField(new DecimalTextRenderer(document.querySelector('#' + prop + 'TextField')));
        } else {
            chart.setTextField(document.querySelector('#' + prop + 'TextField'));
        }

        chart.maxValue = config.virusIndexSettings[prop].gaugeMax;
        chart.setMinValue(config.virusIndexSettings[prop].gaugeMin);
        chart.set(config.virusIndexSettings[prop].gaugeMin);
        chart.label = prop;
        return chart;
    });
};

let DecimalTextRenderer = function(el) {
    this.el = el;
    this.render = function(gauge) {
        this.el.innerHTML = gauge.displayedValue.toPrecision(3);
    } 
}

DecimalTextRenderer.prototype = new TextRenderer();

setup();








///////////////////////////////////////////
/// function which will be outsource in modules later
/////////////////////////////////////////

let chartOptions = {

    getLineChartInformations: function(label) {
        let gradient = null;
        return {
            labels: [],
            datasets: [
                {
                    label: label,
                    backgroundColor: "rgba(0,0,0,0.2)",
                    borderColor: function(context) {
                        return cssVar('fontColor');
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
    },
    
    getLineChartOptions: function(unit, yAxes, line) {
        return {
            elements: {
                point: {
                    radius: 0
                },
                line: line
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
                    },
                    ticks: {
                        autoSkipPadding: 10
                    }
                }],
                yAxes: yAxes
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
    },

    getGaugeChartOptions: function() {
        return {
            angle: 0.15, // The span of the gauge arc
            lineWidth: 0.3, // The line thickness
            radiusScale: 1, // Relative radius
            pointer: {
                length: 0.5, // Relative to gauge radius
                strokeWidth: 0.045, // The thickness
                color: `hsla(${cssVar('--accentHue')},80%,10%,1)`
            },
            limitMax: true,     // If false, max value increases automatically if value > maxValue
            limitMin: true,     // If true, the min value of the gauge will be fixed
            strokeColor: '#E0E0E0',  // to see which ones work best for you
            generateGradient: true,
            highDpiSupport: true,     // High resolution support
        } 
    },
        
    getDetailedGaugeChartOptions: function(prop) {
        let detailedGaugeChartOptions = {
            index: {
                staticZones: [
                    {strokeStyle: cssVar('green'), min: config.virusIndexSettings.index.gaugeMin, max: config.virusIndexSettings.index.good},
                    {strokeStyle: cssVar('orange'), min: config.virusIndexSettings.index.good, max: config.virusIndexSettings.index.ok},
                    {strokeStyle: cssVar('red'), min: config.virusIndexSettings.index.ok, max: config.virusIndexSettings.index.gaugeMax}
                    
                ],
                staticLabels: {
                    font: "0.8em sans-serif",
                    labels: [1,2,3,4,5,6,7,8,9,10],
                    color: cssVar('fontColor'),
                    fractionDigits: 0
                }
            },
            co2: {
                staticZones: [
                    {strokeStyle: cssVar('green'), min: config.virusIndexSettings.co2.gaugeMin, max: config.virusIndexSettings.co2.good},
                    {strokeStyle: cssVar('orange'), min: config.virusIndexSettings.co2.good + 1, max: config.virusIndexSettings.co2.ok},
                    {strokeStyle: cssVar('red'), min: config.virusIndexSettings.co2.ok + 1, max: config.virusIndexSettings.co2.gaugeMax}
                    
                ],
                staticLabels: {
                    font: "0.8em sans-serif",
                    labels: [config.virusIndexSettings.co2.gaugeMin, config.virusIndexSettings.co2.good, config.virusIndexSettings.co2.ok, config.virusIndexSettings.co2.gaugeMax],
                    color: cssVar('fontColor'),
                    fractionDigits: 0
                }
            },
            temperature: {
                staticZones: [
                    {strokeStyle: cssVar('red'), min: config.virusIndexSettings.temperature.gaugeMin, max: config.virusIndexSettings.temperature.badBelow},
                    {strokeStyle: cssVar('orange'), min: config.virusIndexSettings.temperature.badBelow, max: config.virusIndexSettings.temperature.goodBelow},
                    {strokeStyle: cssVar('green'), min: config.virusIndexSettings.temperature.goodBelow, max: config.virusIndexSettings.temperature.goodAbove},
                    {strokeStyle: cssVar('orange'), min: config.virusIndexSettings.temperature.goodAbove, max: config.virusIndexSettings.temperature.okAbove},
                    {strokeStyle: cssVar('red'), min: config.virusIndexSettings.temperature.okAbove, max: config.virusIndexSettings.temperature.gaugeMax}
                    
                ],
                staticLabels: {
                    font: "0.8em sans-serif",
                    labels: [
                        config.virusIndexSettings.temperature.gaugeMin,
                        config.virusIndexSettings.temperature.badBelow,
                        config.virusIndexSettings.temperature.goodBelow,
                        config.virusIndexSettings.temperature.goodAbove,
                        config.virusIndexSettings.temperature.okAbove,
                        config.virusIndexSettings.temperature.gaugeMax],
                        color: cssVar('fontColor'),
                        fractionDigits: 0.1
                    }
            },
            humidity: {
                staticZones: [
                    {strokeStyle: cssVar('red'), min: config.virusIndexSettings.humidity.gaugeMin, max: config.virusIndexSettings.humidity.badBelow},
                    {strokeStyle: cssVar('orange'), min: config.virusIndexSettings.humidity.badBelow, max: config.virusIndexSettings.humidity.goodBelow},
                    {strokeStyle: cssVar('green'), min: config.virusIndexSettings.humidity.goodBelow, max: config.virusIndexSettings.humidity.goodAbove},
                    {strokeStyle: cssVar('orange'), min: config.virusIndexSettings.humidity.goodAbove, max: config.virusIndexSettings.humidity.okAbove},
                    {strokeStyle: cssVar('red'), min: config.virusIndexSettings.humidity.okAbove, max: config.virusIndexSettings.humidity.gaugeMax}
                    
                ],
                staticLabels: {
                    font: "0.8em sans-serif",
                    labels: [
                        config.virusIndexSettings.humidity.gaugeMin,
                        config.virusIndexSettings.humidity.badBelow,
                        config.virusIndexSettings.humidity.goodBelow,
                        config.virusIndexSettings.humidity.goodAbove,
                        config.virusIndexSettings.humidity.okAbove,
                        config.virusIndexSettings.humidity.gaugeMax
                    ],
                    color: cssVar('fontColor'),
                    fractionDigits: 0.1
                }
            }
        } 

        return Object.assign(this.getGaugeChartOptions(), detailedGaugeChartOptions[prop])
    }
};
