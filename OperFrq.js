// Define a global variable to store parsed CSV data
var csvData = {};


function handleDrop(event) {
    event.preventDefault();
    var file = event.dataTransfer.files[0];
    var reader = new FileReader();

    reader.onload = function (e) {
        var contents = e.target.result;

        var csvData = parseCsvToObjects(contents);

        /*var lines = contents.split('\n');

        var headers = lines[0].split(',');
        for (var i = 0; i < headers.length; i++) {
            csvData[headers[i]] = [];
        }

        // Parse rows
        for (var j = 1; j < lines.length; j++) {
            var row = lines[j].split(',');
            for (var k = 0; k < headers.length; k++) {
                var value = parseFloat(row[k]);
                csvData[headers[k]].push(isNaN(value) ? null : value);
            }
        }
        console.log(csvData);*/

        csvData.ax0 = evalFrq(csvData.ax0);
        csvData.ax1 = evalFrq(csvData.ax1);
        //csvData.axC = combineAxes(csvData);
        
        // var bestFrq = findLocalMinima(csvData.axC.powDist);
        var bestFrq0 = findLocalMinimaWithWindow(csvData.ax0.powDist, 5);
        var bestFrq1 = findLocalMinimaWithWindow(csvData.ax1.powDist, 5);
        
        console.log(bestFrq0);
        console.log(bestFrq1);

        plotMe('plot_TR', csvData.ax0, bestFrq0, 'Ax0 ');
        plotMe('plot_EL', csvData.ax1, bestFrq1, 'Ax1 ');
        markDataTips('plot_TR', csvData.ax0, bestFrq0);
        markDataTips('plot_EL', csvData.ax1, bestFrq1);
    };

    reader.readAsText(file);
}


function plotMe(plot_target, csvData, bestFrq, tit) {
    var traces = [];

    // Create traces for each y vector

    // Gyro STD
    traces.push({
        x: csvData.MFREQ,
        y: csvData.GRAWX_std,
        yaxis: 'y1',
        type: 'scatter',
        name: 'GRAWX std',
        row: 1,
        col: 1
    });

    traces.push({
        x: csvData.MFREQ,
        y: csvData.GRAWY_std,
        yaxis: 'y1',
        type: 'scatter',
        name: 'GRAWY std',
        row: 1,
        col: 1
    });

    traces.push({
        x: csvData.MFREQ,
        y: csvData.GRAWZ_std,
        yaxis: 'y1',
        type: 'scatter',
        name: 'GRAWZ std',
        row: 1,
        col: 1
    });


    // Gyro Bias
    traces.push({
        x: csvData.MFREQ,
        y: csvData.GRAWX,
        yaxis: 'y2',
        type: 'scatter',
        name: 'GRAWX Bias',
        row: 2,
        col: 1
    });

    traces.push({
        x: csvData.MFREQ,
        y: csvData.GRAWY,
        yaxis: 'y2',
        type: 'scatter',
        name: 'GRAWY Bias',
        row: 2,
        col: 1
    });

    traces.push({
        x: csvData.MFREQ,
        y: csvData.GRAWZ,
        yaxis: 'y2',
        type: 'scatter',
        name: 'GRAWZ Bias',
        row: 2,
        col: 1
    });


    // Power
    traces.push({
        x: csvData.MFREQ,
        y: csvData.powDist,
        yaxis: 'y3',
        type: 'scatter',
        name: 'Power Distance',
        row: 3,
        col: 1
    });
    

    // Define layout for subplots
    var layout = {
        title: tit + 'Best Operating Frequency',
        grid: { rows: 3, columns: 1 },
        height: 600,
        xaxis: { title: 'Frequency [Hz]' },
        legend: {
            x: 1,
            xanchor: 'top',
            y: 1
          }
    };

    layout.annotation = [
        {
            text: "X1 title",
            x: 90000,
            y: 0.5,
            xref: 'x',
            yref: 'y1'
        }
    ];

    // Create subplots
    Plotly.newPlot(plot_target, traces, layout);
    //Plotly.newPlot('plot_EL', traces, layout);
}

function markDataTips(plot_target, obj, bestFrq) {

    var myPlot = document.getElementById(plot_target);

    for (var i = 0; i < bestFrq.length; i++) {
        annotate_text = 'Frq. = ' + obj.MFREQ[bestFrq[i]]/1000 +
            ' kHz,<br> Power = ' + obj.powDist[bestFrq[i]].toPrecision(4);

        annotation = {
            text: annotate_text,
            x: obj.MFREQ[bestFrq[i]],
            y: obj.powDist[bestFrq[i]], 
            xref: 'x',
            yref: 'y3'
        }
        annotations = myPlot.layout.annotations || [];
        annotations.push(annotation);

        Plotly.relayout(plot_target, { annotations: annotations })
    }

  
    /*myPlot.on('plotly_click', function (data) {
      var pts = '';
      for (var i = 0; i < data.points.length; i++) {
        annotate_text = 'x = ' + data.points[i].x +
          ', y = ' + data.points[i].y.toPrecision(4);
        annotation = {
          text: annotate_text,
          x: data.points[i].x,
          y: parseFloat(data.points[i].y.toPrecision(4)),
          xref: data.points[0].xaxis._id,
          yref: data.points[0].yaxis._id
        }
        annotations = plot.layout.annotations || [];
        annotations.push(annotation);
  
        Plotly.relayout('plot', { annotations: annotations })
      }
    });*/
  }


function handleDragOver(event) {
    event.preventDefault();
}


function downloadExampleCsv() {

    var csvUrl = 'https://raw.githubusercontent.com/amihayb/GyroDriftCalculator/main/example-measurement.csv';

    fetch(csvUrl)
        .then(response => response.blob())
        .then(blob => {
            // Create a temporary anchor element
            var link = document.createElement("a");
            link.href = window.URL.createObjectURL(blob);
            link.download = 'example-measurement.csv'; // Filename when downloaded
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
}

function evalFrq(axObj) {

    const numRows = axObj.GRAWX_std.length;
    const norms = [];
    const powDist = [];
    var pow1 = 0;
    var powDist1 = 0;

    for (let i = 0; i < numRows; i++) {
        pow1 = Math.sqrt(axObj.GRAWX_std[i] ** 2 + axObj.GRAWY_std[i] ** 2 + axObj.GRAWZ_std[i] ** 2) + 
        Math.sqrt(axObj.GRAWX[i] ** 2 + axObj.GRAWY[i] ** 2 + axObj.GRAWZ[i] ** 2);
        if ( (axObj.GRAWX_std[i] > 0.2) || (axObj.GRAWY_std[i] > 0.2) || (axObj.GRAWZ_std[i] > 0.2)) {
            pow1 = pow1 + 10;
        }
        norms.push(pow1);
    }
    axObj.power = norms;

    for (let i = 0; i < numRows; i++) {
        powDist1 = 0;
        for (let j = 0; j < numRows; j++) {
            powDist1 = powDist1 + axObj.power[j] / (1 + Math.abs(j - i)**2);
        }
        powDist.push(powDist1);
    }
    axObj.powDist = powDist;

    return axObj;
}


function combineAxes(axObj){

    const numRows = axObj.ax0.power.length;
    const powDist = [];
    var axC = {};

    axC.MFREQ = axObj.ax0.MFREQ;
    axC.power = normV(axObj.ax0.power, axObj.ax1.power);

    var powDist1 = 0;
    for (let i = 0; i < numRows; i++) {
        powDist1 = 0;
        for (let j = 0; j < numRows; j++) {
            powDist1 = powDist1 + axC.power[j] / (1 + Math.abs(j - i));
        }
        powDist.push(powDist1);
    }
    axC.powDist = powDist;

    return axC;
}


function findLocalMinima(arr) {
    const n = arr.length;
    const localMinimaIndices = [];

    // Check the first element
    if (arr[0] < arr[1]) {
        localMinimaIndices.push(0);
    }

    // Check the middle elements
    for (let i = 1; i < n - 1; i++) {
        if (arr[i] < arr[i - 1] && arr[i] < arr[i + 1]) {
            localMinimaIndices.push(i);
        }
    }

    // Check the last element
    if (arr[n - 1] < arr[n - 2]) {
        localMinimaIndices.push(n - 1);
    }

    return localMinimaIndices;
}


function findLocalMinimaWithWindow(data, windowSize) {
    const localMinimaIndices = [];

    for (let i = 0; i < data.length; i++) {
        let isLocalMinima = true;

        for (let j = Math.max(i - windowSize, 0); j <= Math.min(i + windowSize, data.length - 1); j++) {
            if (data[i] > data[j]) {
                isLocalMinima = false;
                break;
            }
        }

        if (isLocalMinima) {
            // Found a local minimum
            localMinimaIndices.push(i);
        }
    }

    return localMinimaIndices;
}




function parseCsvToObjects(csvData) {
    const lines = csvData.trim().split('\n');
    let axis0Headers = [];
    let axis1Headers = [];

    // Find the line that contains "Axis_0" or "Axis_1"
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("Axis_0")) {
            var idx0 = i;
            if ( isNumericString(lines[i + 1]) ){
                axis0Headers = ['MFREQ','GRAWX_rms','GRAWY_rms','GRAWZ_rms','GRAWX_std','GRAWY_std','GRAWZ_std','GRAWX','GRAWY','GRAWZ'];
            } else {
                axis0Headers = removeBlanks(lines[i + 1]).split(',').map(header => header.trim());
            }
        } else if (lines[i].includes("Axis_1")) {
            var idx1 = i;
            if ( isNumericString(lines[i + 1]) ){
                axis1Headers = ['MFREQ','GRAWX_rms','GRAWY_rms','GRAWZ_rms','GRAWX_std','GRAWY_std','GRAWZ_std','GRAWX','GRAWY','GRAWZ'];
            } else {
                axis1Headers = removeBlanks(lines[i + 1]).split(',').map(header => header.trim());
            }
        }
    }

    const ax0 = [];
    const ax1 = [];

    const headers = axis0Headers;

    for (let j = 0; j < headers.length; j++) {
        ax0[headers[j]] = [];
        ax1[headers[j]] = [];
    }

    for (let i = 2; i < lines.length; i++) {
        const values = lines[i].split(',').map(value => parseFloat(value.trim()));
        const row = {};

        // const headers = i <= idx1 ? axis0Headers : axis1Headers;

        for (let j = 0; j < headers.length; j++) {
            if (!isNaN(values[j])) {
                if (i < idx1) {
                    ax0[headers[j]].push(values[j]);
                } else {
                    ax1[headers[j]].push(values[j]);
                }
            }
            //row[headers[j]] = values[j];
        }

        /*if (i <= idx1) {
            axis0.push(row);
        } else {
            axis1.push(row);
        }*/
    }

    return { ax0, ax1 };
}


const removeBlanks = str => str.replace(/\s/g, '');
const getIdxData = (dataVector, indexes) => indexes.map(i => dataVector[i]);
const normV = (vectorA, vectorB) => vectorA.map((valA, i) => Math.sqrt(valA ** 2 + vectorB[i] ** 2));
// const normV = (vectorA, vectorB) => Math.sqrt(vectorA.reduce((acc, val, i) => acc + (val - vectorB[i]) ** 2, 0));
const createVector = (start, end) => Array.from({ length: end - start + 1 }, (_, i) => start + i);
const isNumericString = str => str.split(',').every(val => !isNaN(parseFloat(val.trim())));

// const calculateY = (xValues, coefficients) => xValues.map(x => coefficients.reduce((acc, coeff, index) => acc + coeff * Math.pow(x, index), 0));
