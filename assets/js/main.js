//Logger component
console.logCopy = console.log.bind(console);

console.log = function(...data)
{
//    if (data instanceof Array && data.length > 0 && !data[0].startsWith("**")) return;
//    if (typeof data  === "string" && !data.startsWith("**")) return;
    var currentDate = moment().format("HH:mm:ss.SSS") + ': ';
    this.logCopy(currentDate, ...data);
};

function call_after_DOM_updated(fn) {
    intermediate = function () {window.requestAnimationFrame(fn)}
    window.requestAnimationFrame(intermediate)
}
//Progress component
function notify(percentage, description) {
  var progressDescription = $('#progressDescription');
  var progressBar = $('.progress-bar');
  var sanitizedPercentage = Math.trunc(percentage)

  progressBar.css('width', sanitizedPercentage+'%').attr('aria-valuenow', sanitizedPercentage);
  progressBar.text(`${sanitizedPercentage}%`)
  if (description != null) {
    progressDescription.text(description)
  }
}

function showProgressBar(title) {
    $('#progressTitle').text(title);
    notify(0, title);
    $('#cover').show();
};

function hideProgressBar() {
    $("#cover").hide();
};
//
function changeLang(lang) {
    var newUrl;
    try {
      var url = new URL(document.location.href);
      url.searchParams.set("lang", lang);
      newUrl = url.toString();
    } catch(e) {
      //explorer
      if (document.location.href.includes("lang=")) {
        newUrl = document.location.href.replace(/lang=[^&]+/, `lang=${lang}`)
      } else if (document.location.href.includes("?")) {
        newUrl = document.location.href + `&lang=${lang}`
      } else {
        newUrl = document.location.href + `?lang=${lang}`
      }
    }

    document.location.href = newUrl;
  }
//Chart dashboard component
function getCharts() {
  return Object.keys(chartsByName)
          .map(key => chartsByName[key]);
}
function addChartDataset(country, dataPoints, color) {
  getCharts().map(async chart => {
    var dataName = country;
    var isMainDataset = false;
    var xLabels= chart.xLabels;
    var xLabel = chart.xLabel;
    var yLabel = chart.yLabel;
    var dataset = buildDataset(country, yLabel, normalize(dataPoints, xLabels, xLabel, yLabel), color, isMainDataset);

    //FIXME copypaste datasets()
    var flip = chartData.rawToSmoothed[yLabel] || chartData.smoothedToRaw[yLabel];
    if (flip != null) {
      console.log(`FLIP ${yLabel} => ${flip}`)
      buildDataset(country, flip, normalize(dataPoints, xLabels, xLabel, flip), color, isMainDataset);
    } else {
      console.log(`NO FLIP FOR ${yLabel}`)
    }
  });
}

async function addDatasetToChart(chart, dataset) {
  console.log(`Chart ${chart.yLabel} adding source ${dataset.label}...`);
  let oldLen = chart.data.datasets.length;
  chart.data.datasets[oldLen] = dataset;
  chart.data.datasets.length = oldLen + 1;
  chart.update();
  console.log(`Chart ${chart.yLabel} added source ${dataset.label}`);
}

var updateQueue = [];
async function receiveDatasetsToShow(datasetLabels, smoothed) {
  updateQueue.push("");
  if (updateQueue.length > 1) {
    console.log(`Already updating, added update request. Queue size=${updateQueue.length}`);
    return;
  }
  let label = `Update charts`;
  console.group(label);
  console.time(label);

  window.requestAnimationFrame(() => showProgressBar("Updating charts..."), 0);

  var charts = getCharts();

  for (let i = 0 ; i < charts.length ; i++) {
    let chart = charts[i];

    setTimeout(() => {
      requestAnimationFrame( () => notify((i + 0.5)/charts.length * 100, `Loading ${chart.yLabel}...`))
      let requiredYLabel = calcYLabel(chartData, chart.rawName, smoothed);

      if (chart.yLabel != requiredYLabel) {
        //force
        chart.yLabel = requiredYLabel;
      }
      const smoothedSuffix = " (smoothed)";
      if (smoothed) {
        chart.config.options.title.text += smoothedSuffix
      } else {
        chart.config.options.title.text = chart.config.options.title.text.replaceAll(smoothedSuffix, "");
      }
      filterDatasetsInChart(chart, datasetLabels.map(label => `${label}_${chart.yLabel}`));
      requestAnimationFrame(() => notify((i + 1)/charts.length * 100, `Loaded ${chart.yLabel}`), 0)
      if (updateQueue.length > 1) {
        updateQueue.pop();
        index = 0;
        i = 0;
        console.log("RESTART DETECTED");
        //continue;
      } else {
        if (i == charts.length - 1) {
              updateQueue.pop();
              requestAnimationFrame(() => hideProgressBar());
              console.timeEnd(label);
              console.groupEnd();
              //Race condition
              if (updateQueue.length > 0) i = 0;
            }
      }


    }, 0);
  }
}

function sameElements(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    return arr1.every(x => arr2.includes(x));
}

function filterDatasetsInChart(chart, datasetIds) {
  var ids = chart.data.datasets.map(dataset => dataset.id);
  var currentIds = ids.toArray();
  var datasetIds = datasetIds.toArray();

  if (sameElements(currentIds, datasetIds)) {
    console.log(`  Chart ${chart.canvas.id}: No changes`);
    return;
  };
  var currentDatasetNames = currentIds.map(id => datasetsById[id].label);
  var newDatasetNames = datasetIds.map(id => datasetsById[id].label);
  console.log(`  Current datasets: ${currentDatasetNames}(${currentDatasetNames.length})`);
  console.log(`  New datasets: ${newDatasetNames}(${newDatasetNames.length})`);

  var selectedDatasets = datasetIds.map(id => datasetsById[id]);
  var oldLength = chart.data.datasets.length;
  selectedDatasets.forEach((dataset, i) => chart.data.datasets[i] = dataset);
  for (var i = selectedDatasets.length ; i < oldLength ; i++) {
    delete chart.data.datasets[i];
  }
  chart.data.datasets.length = selectedDatasets.length;

  chart.update();
}

var xLabels = null;
function plot(chartData, smoothed, name, datasetLabels, isDetailed) {
  var translations = chartData.translations;
  var xLabel = 'date';
  var yLabel = calcYLabel(chartData, name, smoothed);
  var xLabels = buildXLabels(chartData, xLabel);//chartData.xLabels;
  var dataToRender = Object.keys(chartData)
                      .filter(label => label.endsWith("Name"))
                      .map(name => name.replace(/Name$/, ""));

  var allDatasets = datasets(dataToRender, xLabels, xLabel, yLabel);
  var selectedDatasets = datasetLabels.map(country => {
    var datasetId = `${country}_${yLabel}`;
    if (datasetsById[datasetId] == null)
      throw new Error(`No dataset ${datasetId} available ${Object.keys(datasetsById)}`);
    return datasetsById[datasetId];
  });
  var chartName = `chart_${name}`;

  var locale = chartData.locale;
    var config = {
      type: 'line',
      //parsing: false,

      data: {
        labels: xLabels,
        datasets: selectedDatasets
      },
      options: {
        normalized: true,
        spanGaps: true, // enable for all datasets
        //showLines: false, // disable for all datasets
        animation: {
                    duration: 0 // general animation time
        },
        hover: {
            animationDuration: 0 // duration of animations when hovering an item
        },
        responsiveAnimationDuration: 0,
        elements: {
            line: {
                tension: 0, // disables bezier curves
//                fill: false,
//                stepped: false,
//                borderDash: []
            }
        },
        responsive: true,
        onClick: x => {
          if (isDetailed) return;

          var miniDatasets = chartsByName[`chart_${name}_mini`].config.data.datasets.map(x => x.label);
          let miniSmooth = chartsByName[`chart_${name}_mini`].yLabel.includes("smoothed");
          plot(chartData, miniSmooth, name, miniDatasets, true);
          document.getElementById("chartModal").style.display = "block";
          document.getElementById("chartModal").focus();
        },
        title: {
          display: true,
          text: `${translations[name]}`
        },
        tooltips: {
          mode: 'index',
          intersect: false,
          itemSort: (a, b, data) => b.value - a.value,
          callbacks: {
              label: function(tooltipItem, data) {
                  return `${data.datasets[tooltipItem.datasetIndex].label}: ${data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index].toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
              }
          }
        },
        hover: {
          mode: 'nearest',
          intersect: true
        },
        scales: {
          xAxes: [{
            type: 'time',
            distribution: 'linear',
            time: {
              unit: 'day',
              tooltipFormat: 'MMMM D, YYYY'
            },
            ticks: {
                autoSkip: false,
                maxRotation: 45,
                minRotation: 45,
                sampleSize: 5
            }
          }],
          yAxes: [{
            display: true,
            scaleLabel: {
              display: true,
              labelString: translations[name]
            }
          }]
        },
        plugins: {
        	zoom: {
        		pan: {
        			enabled: true,
        			mode: 'xy',
        			rangeMin: {
        				x: null,
        				y: null
        			},
        			rangeMax: {
        				x: null,
        				y: null
        			},
        			speed: 20,
        			threshold: 10
        		},

        		zoom: {
        			enabled: true,
        			drag: false,
        			mode: 'xy',
        			rangeMin: {
        				x: null,
        				y: null
        			},
        			rangeMax: {
        				x: null,
        				y: null
        			},
        			speed: 0.1,
        			threshold: 2,
        			sensitivity: 3
        		}
        	}
        }
      }
    };

    var theChart = createChart(chartName, isDetailed, config);
    theChart.xLabels = xLabels;
    theChart.xLabel = xLabel;
    theChart.yLabel = yLabel;
    theChart.rawName = name;
  //}
}

function calcYLabel(chartData, name, smoothed) {
  const newYLabel = !smoothed ? name : (chartData.rawToSmoothed[name] || name);
  return newYLabel;
}

function datasets(dataToRender, xLabels, xLabel, yLabel) {
  return dataToRender.map((source, idx) => {
    var dataName = chartData[`${source}Name`];
    var dataValue = chartData[`${source}Data`];
    var color = chartData[`${source}Color`]

    var isMainDataset = idx == 0;

    //FIXME copypaste addChartDataset
    var flip = chartData.rawToSmoothed[yLabel] || chartData.smoothedToRaw[yLabel];
    if (flip != null) {
      buildDataset(dataName, flip, normalize(dataValue, xLabels, xLabel, flip), color, isMainDataset);
    }

    return buildDataset(dataName, yLabel, normalize(dataValue, xLabels, xLabel, yLabel), color, isMainDataset);
  });
}

function buildXLabels(chartData, xLabel) {
  var all = Object.keys(chartData)
        .filter(label => label.endsWith("Data"))
        .map(label => chartData[label])
        .reduce((arr, data) => arr.concat(data), [])
        .map(point => moment(point[xLabel]));
  return Array.from(new Set(all)).sort((a, b) => a - b);
}

window.chartColors = {
	red: 'rgb(255, 99, 132)',
	blue: 'rgb(54, 162, 235)',
	green: 'rgb(75, 192, 192)',
	purple: 'rgb(153, 102, 255)',
	orange: 'rgb(255, 159, 64)',
	yellow: 'rgb(255, 205, 86)',
	grey: 'rgb(201, 203, 207)'
};

function color(index) {
  var colorNames = Object.keys(window.chartColors);
  var colorName = colorNames[index % colorNames.length];
  return window.chartColors[colorName];
}

function buildDataset(country, yLabel, data, color, isMainDataset) {
  let id = `${country}_${yLabel}`;
  if (datasetsById[id] != null) {
    console.log(`Build dataset ${id}, duplicated`)
  } else {
    //console.log(`Build dataset ${id}`)
  }
  let dataset = {  label: country,
            backgroundColor: color,
            borderColor: color,
            data: data,
            pointRadius: 1.5 + (isMainDataset ? 0.5 : 0),
            borderWidth: 1 + (isMainDataset ? 0.5 : 0),
            fill: false,
            id: id
            };
  datasetsById[id] = dataset;
  return dataset;
}

function normalize(data, xLabels, xLabel, yLabel) {
  var lineData = data.reduce(function(o, point) {
      o[point[xLabel]] = point[yLabel];
      return o;
      }, {});

  return xLabels.map(date => lineData[date.format("YYYY-MM-DD")]);//FIXME why || null, to detect anomalies??
}

var chartsByName = {};
var canvasByName = {};
var datasetsById = {};
function createChart(chartName, isDetailed, config) {
  var chartType = isDetailed ? 'detailed' : 'mini';
  var canvas_id = `canvas_${chartName}_${chartType}`;
  var chart_id = `${chartName}_${chartType}`;


  var canvas = canvasByName[canvas_id];
  if (canvas == null) {
    var canvas = document.createElement('canvas');
    canvas.id = canvas_id;
    canvasByName[canvas_id] = canvas;
    console.log(`Creating chart ${chart_id}: ${config.data.datasets.length}`);
    chartsByName[chart_id] = new Chart(canvas.getContext('2d'), config);
    window.requestAnimationFrame(() => console.log(`Created chart ${chart_id}: ${config.data.datasets.length}`));
//    window.requestAnimationFrame(() => 1);
    canvas.chart = chartsByName[chart_id];
  }


  var div = document.createElement('div');
  div.classList.add(isDetailed ? "detailed-chart-container" : "chart-container");
  div.appendChild(canvas);

  var parent = isDetailed ? document.getElementById('chart-modal-container') : document.getElementById('container');
  parent.appendChild(div);

  if (isDetailed) {
    document.getElementById("chartModal").focus();
  }

  var theChart = chartsByName[chart_id];
  document.getElementById('resetZoom').onclick = function(e) {theChart.resetZoom();};

  function zoomOut(ev) {
    ev.stopPropagation();
    ev.stopImmediatePropagation();
    ev.preventDefault();
    ev.target.chart.resetZoom();

    return false;
  }

  canvas.addEventListener('contextmenu', zoomOut, false);
  return theChart;
}

window.addEventListener("load", function() {
  var modal = document.getElementById("chartModal");

  var closeButton = document.getElementsByClassName("close")[0];

  function closeModal() {
    modal.style.display = "none";
    var parent = document.getElementById("chart-modal-container");
    while (parent.firstChild) {
      parent.firstChild.remove();
    }
  }

  modal.addEventListener("keyup", function(event) {
    if(event.key === "Escape") {
      closeModal();
    }
  });


  closeButton.onclick = function() {
    closeModal();
  }

  window.onclick = function(event) {
    if (event.target == modal) {
      closeModal();
    }
  }
});


//Map component
var map = null;
var mapPopup = { closed: moment() };
var compareButton = null;

var undoButton = null;
var redoButton = null;

var undoStack = [];
var redoStack = [];

function _actionToString(action) {
  return `${action.type} ${action.country} position=${action.position} arcs=${Object.keys(action.orthodromic).join(', ')}`;
}

function _getCreateAction(country, clickedLatLon) {
  let createAction = undoStack.find(action => action.type == 'add' && action.country == country && action.latLng.distanceTo(clickedLatLon) < 1) || redoStack.find(action => action.type == 'add' && action.country == country && action.latLng.distanceTo(clickedLatLon) < 1);
  if (createAction == null) throw `No create action for ${country}, compared=${compared}`;

  return createAction;
}

function _moveOtherCountriesToNewBase(newBase, newBaseOrthodromics) {

  Object.keys(newBaseOrthodromics).forEach(country => {
    if (!compared.includes(country)) throw `Unknown ortho ${country}, expected any of ${compared}`;
  })
  let currentBase = compared[0];
  let currentBaseArcs = compared.slice(1);

  let newBaseArcs = Object.keys(newBaseOrthodromics);
  console.group(`moveOtherCountriesToNewBase currentBase=${currentBase}, currentBasearcs=${currentBaseArcs} -> newBase=${newBase}, newBaseArcs=${newBaseArcs}`)

  let newBaseOrthos = newBaseArcs.map(x => newBaseOrthodromics[x]);

  //Remove previous base arcs
  console.group(`Remove old base ${currentBase} arcs`);
  for (let i = 0 ; i < currentBaseArcs.length ; i++) {
    let destinationCountry = currentBaseArcs[i];
    console.log(`Arc ${currentBase} -> ${destinationCountry}`)
    removeOrtho(currentBase, destinationCountry);
  }
  console.groupEnd();

  //draw new base arcs
  console.group(`Draw arcs for new base ${newBase}`);
  for (let i = 0 ; i < newBaseOrthos.length ; i++) {
    let destinationCountry = newBaseOrthos[i].country;
    let orthodromic = newBaseOrthos[i].ortho;

    console.log(`Arc ${newBase} -> ${destinationCountry}`)
    drawOrtho(map, newBase, destinationCountry, orthodromic, color(i));
  }
  console.groupEnd();
}

function notifyHistory(e, lambda) {
  Sentry.withScope(function(scope) {
    let theHistory = currentHistory();

    scope.setExtra("history", theHistory);

    let errorId = Sentry.captureException(e);

    let data = {
        errorId : errorId,

        appCodeName: navigator.appCodeName,
        appName: navigator.appName,
        appVersion: navigator.appVersion,
        product: navigator.product,
        platform: navigator.platform,

        jsonPayload: theHistory
      };

      jQuery.ajax({
          method: "POST",
          headers: {"X-XSRF-TOKEN": csrf_token()},
          url: "/history",
          data: JSON.stringify(data)
      }).always(lambda);
  });

}

async function drawMap(mapDivId, originName, originPoint, onClickHandler, comparable) {
  console.log("Rendering map");
  map = L.map(mapDivId).setView(originPoint, 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    continuousWorld: false,
    noWrap: true,
    inertia: true,
    //bounds: [ [-90, -180],[90, 180] ]
  }).addTo(map);
  //map.setMaxBounds(map.getBounds());
  map.setMaxBounds([ [-90, -180],[90, 180] ]);

  $.getJSON({ url:`/assets/js/all.110m.json`,
    success: function(theData) {

      theData.features.forEach(feature => {
        function remarkCountry(show) {
          return {stroke: false, fillColor: "green", fill: true, fillOpacity: show ? 0.3 : 0};
        }
        let geojson = L.geoJSON(feature.geometry, {style: function(layer) {
          return remarkCountry(false);
        } });

        geojson.addTo(map);
        geojson
          .on('mouseover', function(e){
              e.layer.setStyle(remarkCountry(true))
          })
          .on('mouseout', function(e){
              e.layer.setStyle(remarkCountry(false))
          });
      });
    }
  });

  map.panTo(originPoint);

  var lastLatLon = null;
  map.on('contextmenu', function(e) { map.setView(originPoint, 2); });


  //** HACK hack to cancel leaflet click bubling when closing popup
  map.on('click', async function(e) {
    //*1 hack
    let ignoreClick = mapPopup.closed != null && moment() - mapPopup.closed < 50;
    if (ignoreClick) {
      return;
    }

    var clickedLatLon = e.latlng;
    await onClickHandler(clickedLatLon);
  });

  //FIXME:
  //view *1
  //Leaflet does not allow to stop event propagation
  map.on('popupclose', e => mapPopup.closed = moment());
  //** HACK hack to cancel leaflet click bubling when closing popup

  L.easyButton("<span style=\"font-size: 2.5em;\">&target;</span>", function(btn, map) {
    map.setView(originPoint, 2);
  }, "Reset view").addTo(map);

  if (comparable) {
    function _redo(action) {
      let country = action.args[0];
      var undoable = false;
      if (action.type == "add") {
        if (compared.includes(country)) {
          compareButtonStatusUpdate();
          throw `Trying to add ${country} twice`;
        }
        let addArcMultiCreateArgs = action.args.slice();

        addArcMultiCreateArgs[1] = undoable;
        addArcMultiCreateArgs[9] = action.position;

        addArcMulti(...addArcMultiCreateArgs);
      } else if (action.type == "remove") {
        if (!compared.includes(country)) {
          compareButtonStatusUpdate();
          throw `Trying to remove non loaded country ${country}`
          return;
        }
        var justOneCountry = compared.length == 1;
        if (justOneCountry) {
          throw `Trying to remove ${action.country} being the last one, shouldnt happen`;
          compareButtonStatusUpdate();
          return;
        }

        //Search for create action
        let orthos = _getCreateAction(country, action.latLon).orthodromic;

        //let orthos = action.orthodromic;
        let isBase = action.position == 0;
        if (isBase) {
          console.log("*** FOUND ORTHOS", orthos.map(x => x.country))
          var data = compared.slice(1).map(x => {
            var ortho = orthos[x];
            if (ortho == null) throw `No ortho for ${x}`;
            return ortho;
          });

          //Remove previous arcs, draw new ones
          let currentBase = compared[0];
          for (var i = 0 ; i < data.length ; i++) {
            var destinationCountry = data[i].country;
            var orthodromic = data[i].ortho;

            removeOrtho(currentBase, destinationCountry);
          }
        }

        removeArc(country, undoable);
      } else {
        console.error(`Unexpected action type=${action.type}, can't undo `);
      }
    }

    redoButton = L.easyButton('fa-repeat', function() {
      let action = redoStack.slice(-1)[0];

      try {
        _redo(action)

        redoStack.pop();
        undoStack.push(action);

        compareButtonStatusUpdate();
      } catch(e) {
        redoButton.button.style = "background-color: red";
        redoButton.disable();

        notifyHistory(e, compareAll);

        throw e;
      }
    }, "Redo").addTo(map);

    undoButton = L.easyButton('fa-undo', function() {
      let action = undoStack.slice(-1)[0];

      try {
        _undo(action);
        undoStack.pop();
        redoStack.push(action);

        compareButtonStatusUpdate();
      } catch(e) {
        undoButton.button.style = "background-color: red";
        undoButton.disable();

        notifyHistory(e, compareAll);
        throw e;
      }


    }, "Undo").addTo(map);

    function _undo(action) {
      console.group(`Execute undo ${_actionToString(action)}`);
      try {
        if (action.type == "add") {
          _executeRemove(action.country, action.position, action.orthodromic);
        } else if (action.type == "remove") {
          let createAction = _getCreateAction(action.country, action.latLng);

          _executeAdd(createAction, action.position);
        } else {
          throw `Unexpected action type=${action.type}, can't undo `;
        }
      } finally {
       console.groupEnd();
     }
    }

    function _redo(action) {
      console.group(`Execute undo ${_actionToString(action)}`);
      try {
        let country = action.args[0];
        var undoable = false;

        if (action.type == "add") {
          _executeAdd(action)
        } else if (action.type == "remove") {
          _executeRemove(action.country, action.position, action.orthodromic);
        } else {
          console.error(`Unexpected action type=${action.type}, can't undo `);
        }
      } finally {
        console.groupEnd();
      }
    }

    function _executeRemove(country, position, countryOrthodromicArcs) {
      var undoable = false;

      if (!compared.includes(country)) {
        compareButtonStatusUpdate();
        throw `Trying to remove non loaded country ${country}`
        return;
      }
      var justOneCountry = compared.length == 1;
      if (justOneCountry) {
        throw `Trying to remove ${action.country} being the last one, shouldnt happen`;
        compareButtonStatusUpdate();
        return;
      }

//      let isBase = position == 0;
//      if (isBase) {
//        /* FIXME
//
//          */
//        let newBase = compared[1];
//        let createAction = _getCreateAction(newBase);
//        let newBaseArcs = compared.slice(2).map(otherCountry => createAction.orthodromic[otherCountry]).reduce((acum, ortho) => {
//           acum[ortho.country] = ortho;
//           return acum;
//         }, {});
//
//        _moveOtherCountriesToNewBase(newBase, newBaseArcs)
//      }

      removeArc(country, undoable);
    }

    function _executeAdd(action, position) {
      let country = action.args[0];
      var undoable = false;

      if (compared.includes(country)) {
        undoStack.pop();
        throw new Error(`Unexpected add country ${country}, it is already present in compared`);
      }

      let isBase = position == 0;
      if (isBase) {
        /* FIXME

        */
        let newBase = action.country;
        let newBaseOrthos = compared.map(otherCountry => action.orthodromic[otherCountry]).reduce((acum, ortho) => {
          acum[ortho.country] = ortho;
          return acum;
        }, {});
        _moveOtherCountriesToNewBase(newBase, newBaseOrthos);
      } else {
        //console.log("***** finding base arc")
        //let createArcMultipleIndex = undoStack.findIndex(action => action.type == 'add' && action.country == compared[0]);
        //if (createArcMultipleIndex < 0) throw `No definition found for base ${compared[0]}`;
        //let baseToCountryOrthodromic = undoStack[createArcMultipleIndex].orthodromic.find(x => x.country == country).ortho;

        //drawOrtho(map, destinationCountry, baseToCountryOrthodromic, color(position));
      }


      let createArcMultipleArguments = action.args.slice();//clone
      createArcMultipleArguments[1] = undoable;
      if (isBase) createArcMultipleArguments[4] = null;//Orthodromic
      createArcMultipleArguments[9] = position;
      addArcMulti(...createArcMultipleArguments);
    }

    compareButton = L.easyButton('fa-bar-chart', function(){
      compareAll();
    }, "Compare selected countries").addTo(map);

    compareButtonStatusUpdate();
  }

  console.log("Rendered map");
  return map;
}

function currentHistory() {
  function sanitize(actionArray) {
    return actionArray.map(action => Object.assign({}, action))
      .map(action => {
        action.args = action.args.slice();
        for (let i = 0 ; i < action.args.length ; i++) {
          let value = action.args[i];
          if (value instanceof Array || (value != null && value["type"] == "LineString")) {
            action.args[i] = "nullified";
          }
        }
        action.orthodromic = Object.assign({}, action.orthodromic);
        for (let key of Object.keys(action.orthodromic)) {
          action.orthodromic[key].ortho = Object.assign({}, action.orthodromic[key].ortho);
          action.orthodromic[key].ortho.coordinates = [action.orthodromic[key].ortho.coordinates[0], action.orthodromic[key].ortho.coordinates.slice(-1)[0]];
        }
        return action;
      });
  }


  return { historyActions : sanitize(historyActions), undoStack: sanitize(undoStack), redoStack: sanitize(redoStack) };
}

var historyActions = [];
function _addAction(action) {
  historyActions.push(action);

  if (action.type == 'add') {
    undoStack.push(action);
  } else if (action.type == 'remove') {
    undoStack.push(action);
  } else {
    throw `Unexpected action type=${action.type}, ${action}`;
  }
}

function compareButtonStatusUpdate() {
  if (compared.length > 1) {
    compareButton.enable();
  }
  else {
    compareButton.disable();
  }

  if (undoStack.length > 1) {
    undoButton.enable();
    var currentUndo = undoStack[undoStack.length - 1];
    undoButton.button.title = `Undo: ${currentUndo.type} ${currentUndo.country} position=${currentUndo.position}`
  } else {
    undoButton.disable();
    undoButton.button.title = "Undo";
  }

  if (redoStack.length > 0 ) {
    redoButton.enable();
    var currentRedo = redoStack[redoStack.length - 1];
    redoButton.button.title = `Redo: ${currentRedo.type} ${currentRedo.country} position=${currentRedo.position}`
  } else {
    redoButton.disable();
    redoButton.button.title = "Redo";
  }

  console.group("Validate")
  console.log("COMPARED", compared);
  console.group(`Undo (${undoStack.length})`);
  undoStack.map(_actionToString).forEach(x => console.log(x));
  console.groupEnd()
  console.group(`Redo (${redoStack.length})`);
  redoStack.map(_actionToString).forEach(x => console.log(x));
  console.groupEnd()
  console.log(`Markers(${Object.keys(markers).length}): ${Object.keys(markers).join(', ')}`)
  console.log(`Arcs (${Object.keys(orthoArcs).length})`);

  try {

    let arcNames = Object.keys(orthoArcs);
    console.group(`Arcs (${arcNames.length})`);
    try {
      for (let key of arcNames) {
        if (orthoArcs[key] == null) {
          throw `Null arc ${key}`;
        } else {
          let [source, destination] = _orthoKeyToSourceDestination(key);
          let ortho = orthoArcs[key];

          console.log(`${source}(${markers[source].getLatLng()}) -> ${destination}(${markers[destination].getLatLng()})`)
          //Distance in meters
          let orthoSource = ortho.options.style.sourceLatLng;
          let orthoDestination = ortho.options.style.destinationLatLng;
          let sourceLatLng = markers[source].getLatLng();
          let destinationLatLng = markers[destination].getLatLng();
          let distanceSource = sourceLatLng.distanceTo(orthoSource);
          let distanceDestination = destinationLatLng.distanceTo(orthoDestination);

          if (distanceSource > 1) {
            console.log(`*** Source: ${source}`, sourceLatLng);
            console.log(`*** Ortho`, ortho);
            console.log(`*** Error in sourceArc expected=${sourceLatLng}, actual=${orthoSource}`);
            throw `Invalid source ${source} for arc`;
          }

          if (distanceDestination > 1) {
            console.log(`*** Destination: ${destination}`, destinationLatLng);
            console.log(`*** Ortho`, ortho);
            console.log(`*** Error in destinationArc expected=${destinationLatLng}, actual=${orthoDestination}`);
            throw `Invalid destination ${destination} for arc`;
          }
        }
      }
    } finally {
      console.groupEnd();
    }



    let expectedArcs = compared.slice(1).map(destination => _orthoKey(compared[0], destination));
    if (!(arcNames.length == expectedArcs.length && expectedArcs.every(key => orthoArcs[key] != null))) {
      let missing = expectedArcs.filter(key => !arcNames.includes(key))
      let unexpected = arcNames.filter(key => !expectedArcs.includes(key))
      throw `Invalid arcs missing=${missing.join(',')} unexpected=${unexpected.join(',')}`;
    }

    let markerNames = Object.keys(markers);
    for (let markerName of markerNames) {
      if (markers[markerName] == null) {
        throw `Null arc ${markerName}`;
      }
    }
    if (!sameElements(markerNames, compared)) {
      throw `Invalid markers=${markerNames} expected=${compared}`;
    }
  }  finally {
    console.groupEnd();
  }
}

async function countryArcOnClickHandler(clickedLatLon) {
  var sourceOrigin = compared[0];
  var sourceLatLng = markers[sourceOrigin].getLatLng();
  let label = `Ajax query call country for clicked coordinates`;
  console.time(label);
  $.ajax({ url:`/query?lat0=${clickedLatLon.lat}&lon0=${clickedLatLon.lng}&source=${sourceOrigin}&sourceLat=${sourceLatLng.lat}&sourceLon=${sourceLatLng.lng}`,
      success: function(theData) {
        console.timeEnd(label);
        var data = theData[0];
        if (compared.includes(data.country)) {
          if (compared[0] != data.country) {
            removeArc(data.country);
          } else {
            //Do nothing
          }

          return;
        }

        if (data.country != null) {
          var orthodromic = data.ortho;
          var country = data.country;
          var iconName = data.icon;
          var canonicalCountryCoords =  L.latLng(data.latLon.lat, data.latLon.lon);
          var rowObject = data.row;
          var dataset = data.dataset;


          //FIXME who should be the owner of chartData?
          chartData[country] = data.dataset;


          var countryColor = color(compared.length);

          addArcMulti(country, true, clickedLatLon, canonicalCountryCoords, orthodromic, iconName, countryColor, dataset, rowObject);
        } else {
          console.warn(`No country for lat=${clickedLatLon.lat}, lon=${clickedLatLon.lng}`);
        }
      }
  });
}
function addArcMulti(country, undo, clickedLatLon, canonicalCountryCoords, orthodromic, iconName, countryColor, dataset, rowObject, position = -1) {
  if (undo) redoStack = [];

  let label = `Add arc ${compared[0]} -> ${country}`;
  console.group(label)
  console.time(label);
  try {
    addChartDataset(country, dataset, countryColor);
    addNewTableRow(rowObject);
    let currentBase = compared[0];
    addArc(currentBase, country, clickedLatLon, canonicalCountryCoords, orthodromic, iconName, countryColor, position);

    if (undo) {
      let args = [];
      for (var i = 0 ; i < arguments.length ; i++) args.push(arguments[i]);

      var action = { type: "add", country: country, args: args, orthodromic: {}, position: compared.indexOf(country), latLng: clickedLatLon };
      if (compared.indexOf(country) > 0) {
        var baseAction = undoStack.slice().reverse().find(action => action.type == "add" && action.args[0] == compared[0]);
        baseAction.orthodromic[country] = {country: country, ortho: orthodromic, clickedLatLon: clickedLatLon};
      }
      _addAction(action);
    }
    compareButtonStatusUpdate();
  } finally {
    console.timeEnd(label);
    console.groupEnd();
  }
}

var orthoArcs = {};
var markers = {};
var compared = [];

function _orthoKey(source, destination) {
  return `${source} -> ${destination}`;
}

function _orthoKeyToSourceDestination(key) {
  return key.split(" -> ");
}

function drawOrtho(map, source, destination, orthodromic, arcColor) {
  let key = _orthoKey(source, destination);

  if (orthoArcs[key] != null) throw `Trying to created duplicated arc ${key}`;

  let sourceLatLng = L.latLng(orthodromic.coordinates[0].slice().reverse());
  let destinationLatLng = L.latLng(orthodromic.coordinates.slice(-1)[0].slice().reverse());
  console.log(`${source}(${sourceLatLng}), ${destination}(${destinationLatLng})`);

  orthoArcs[key] = L.geoJSON(orthodromic, { style: {color: arcColor, sourceLatLng: sourceLatLng, destinationLatLng: destinationLatLng} }).addTo(map);
}

function removeOrtho(source, destination) {
  let key = _orthoKey(source, destination);

  if (orthoArcs[key] != null) {
    orthoArcs[key].remove();
    delete orthoArcs[key];
  } else {
    console.warn(`*** can not remove arc ${key} because is null`);
  }
}

function iconUrl(iconName) {
  return `https://static.safetravelcorridor.com/assets/icons/${iconName}.png`;
}

//var coords = {};
function addArc(source, country, clickedLatLon, canonicalLatLon, orthodromic, iconName, color, position) {
//  coords[country] = canonicalLatLon;
  let closeableButtons=true;
  let comparable=true;

  if (orthodromic != null) {
    drawOrtho(map, source, country, orthodromic, color);
  }

  var myIcon = L.icon({
      iconUrl: iconUrl(iconName),
      iconSize: [16, 16]
  });

  var marker = L.marker([clickedLatLon.lat, clickedLatLon.lng], {title: country, icon: myIcon, riseOnHover: true})
    .on("click", x => attachPopup(x.target))
    .addTo(map);
  markers[country] = marker;

  if (comparable) {
    if (position < 0) {
      compared.push(country);
    } else {
      compared.splice(position, 0, country);
    }

  }

  addArcButton(country, iconUrl(iconName), closeableButtons, position);
}

function _popupid(country) {
  let sanitized = country.replaceAll(/[^a-zA-Z]+/g, "_");
  return `popupTable${sanitized}`;
}

function _renderMiniTable(...selectedSources) {

  var lastPoints = selectedSources.map(name => chartData[name])
                           .map(sourceAllPoints => sourceAllPoints.slice(-1)[0]);

  var columnSelection = ['date', 'new_cases_per_million', 'total_cases_per_million', 'new_deads_per_million', 'total_deads_per_million'];
  var f = x => (typeof x == 'number') ? x.toLocaleString(chartData.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (x || "");
  var data = columnSelection.map(column => [chartData.translations[column] || column, ...lastPoints.map(point => f(point[column]))])
  var columns = selectedSources.map(name => ({title: `<img width="16px" style="float: right;" src="${markerIcon(name)}">`}));
  columns.splice(0, 0, {});

  let country = selectedSources[selectedSources.length - 1];
  $(`#${_popupid(country)}`).DataTable( {
    paging: false,
    searching: false,
    info: false,
    ordering: false,
    data: data,
    columns: columns,
    columnDefs: [
          {
              targets: [0],
              className: 'dt-body-left'
          },
          {
              targets: "_all",
              className: 'dt-body-right'
          },
        ]
  } );
}

function countryPopupOnclickHandler(clickedLatLon) {
  let label = `Ajax query for coordinates`
  console.time(label);
  $.ajax({ url:`/query?lat0=${clickedLatLon.lat}&lon0=${clickedLatLon.lng}&source=europe`,
      success: async function(theData) {
        console.timeEnd(label);
        var data = theData[0];

        if (data != null && data.country != null) {
          var country = data.country;
          var iconName = data.icon;
          var canonicalCountryCoords =  L.latLng(data.latLon.lat, data.latLon.lon);

          chartData[country] = data.dataset;

          var destinationIconUrl = iconUrl(iconName);
          markers[country] = {options: {icon: {options: {iconUrl: destinationIconUrl}}}};//fake marker for icon retrieval

          var countryUrl = `/country/${encodeURIComponent(country)}`;
          var content = singleCountryPopup(country);

            //Remove previous table
            $(`#${_popupid(country)}`).remove();

          L.popup()
            .setLatLng(clickedLatLon)
            .setContent(content)
            .openOn(map);


          _renderMiniTable(country);
        } else {
          console.warn(`No country for lat=${clickedLatLon.lat}, lon=${clickedLatLon.lng}`);
        }
      }
  });
}

function attachPopup(target) {
  var destinationCountry = target.options.title;
  target.unbindPopup();
  target.bindPopup(popup(destinationCountry)).openPopup();

  var selectedSources = [];
  if (compared.length > 0 && compared[0] != destinationCountry) {
    var sourceCountry = compared[0];
    selectedSources.push(sourceCountry);
  }
  selectedSources.push(destinationCountry);
  _renderMiniTable(...selectedSources);
}

function markerIcon(name) {
  return markers[name].options.icon.options.iconUrl;
}

function popup(destinationCountry) {
  let content = null;

  if (compared.length > 1 && compared[0] != destinationCountry) {
    //Country comparison
    var sourceCountry = compared[0];
    var corridorUrl = `/corridor/${encodeURIComponent(sourceCountry)}/${encodeURIComponent(destinationCountry)}`;
    content = `<div class="card">
                 <h5 class="card-header">Travel corridor</h5>
                 <div class="card-body">
                   <h5 class="card-title">${sourceCountry}, ${destinationCountry}</h5>
                   <p class="card-text"><table id="${_popupid(destinationCountry)}" class="display compact row-border" nostyle="font-size: 8px;padding: 5px;border-spacing: 0px;"></table></p>
                   <a href="${corridorUrl}" class="btn btn-primary">View corridor</a>
                 </div>
               </div>`;
  } else {
    content = singleCountryPopup(destinationCountry);
  }

  return content;
}

function singleCountryPopup(country) {
  let countryUrl = `/country/${encodeURIComponent(country)}`;
  return `<div class="card">
                     <h5 class="card-header">${country}</h5>
                     <div class="card-body">
                       <p class="card-text"><table id="${_popupid(country)}" class="display compact row-border" nostyle="font-size: 8px;padding: 5px;border-spacing: 0px;"></table></p>
                       <a href="${countryUrl}" class="btn btn-primary">View country info</a>
                     </div>
                   </div>`;
}

function compareAll() {
  if (compared.length < 2) {
    alert("Please select at least two countries");
    return;
  }

  var compareUrl = `/compare/${compared.map(x => encodeURIComponent(x)).join('/')}`;
  window.location.href=compareUrl;
}

function removeArc(destinationCountry, undo=true) {
  let label = `Remove arc ${destinationCountry}`
  console.group(label);
  if (undo) redoStack = [];

  //if (undoStack.find(action => action.type == 'add' && action.country == destinationCountry) == null) {
  //  throw "NO ADD DATA FOR" + destinationCountry;
//    console.log("************+ No undo data for " + destinationCountry);
//    var latLng = markers[destinationCountry].getLatLng();
//    var orthodromic = null;
//    var iconName = markers[destinationCountry].options.icon.options.iconUrl.match("/([^/]+).png")[1];
//    var countryColor = null;
//    var dataset = chartData[destinationCountry].slice(-1)[0];
//    var rowObject = table.rows().data().toArray().find(row => row[1].match(">(.+)<")[1] == destinationCountry).slice();
//    console.log("FOUND", rowObject)
//    undoStack.push({type: "add", country: destinationCountry, args: [destinationCountry, undo, latLng, latLng, orthodromic, iconName, countryColor, dataset, rowObject]})
//  }

  let position = compared.indexOf(destinationCountry);
  if (compared.length == 1 || compared[0] == destinationCountry) {
    if (compared.length > 2) {
      var newOriginName = compared[1];
      var newOriginLatLon = markers[newOriginName].getLatLng()
      var subQuery = compared.slice(2)
        .map(destination => markers[destination].getLatLng())
        .map((latLon, i) => `lat${i}=${latLon.lat}&lon${i}=${latLon.lng}` ).join("&");
      var query = `/query?source=${newOriginName}&sourceLat=${newOriginLatLon.lat}&sourceLon=${newOriginLatLon.lng}&${subQuery}`;
      var baseAction = _getCreateAction(newOriginName, newOriginLatLon);
      let cachedOrthos = compared.slice(2).every(c => baseAction.orthodromic[c] != null);

      if (cachedOrthos) {
        /* FIXME copy paste

        */
        let newBase = newOriginName;
        let newBaseOrthos = compared.slice(2).map(otherCountry => baseAction.orthodromic[otherCountry]).reduce((acum, ortho) => {
            acum[ortho.country] = ortho;
            return acum;
          }, {});

        console.log(`******  CACHED NEW BASE=${newOriginName}, arcs=${Object.keys(newBaseOrthos)}, compared=${compared}`)
        _moveOtherCountriesToNewBase(newOriginName, newBaseOrthos);

        var countryToRemove = compared[0];
        var countryToRemoveLatLng = markers[countryToRemove].getLatLng();
        shiftBase();
        removeRow(countryToRemove);

        if (undo) {
          var action = {type: "remove", country: countryToRemove, args: [countryToRemove], position: position, orthodromic: {}, latLng: countryToRemoveLatLng};
          _addAction(action);
        }
        compareButtonStatusUpdate();
      } else {
        console.log(`Ajax query call: newBase=${newOriginName}, compared=${compared.join(', ')}`)
        $.ajax({ url:query,
            success: function(data) {
              //Move arcs to new base
              console.log(`Ajax query call received: newBase=${newOriginName}, arcs=${data.map(x=> x.country).join(', ')}, compared=${compared.join(', ')}`)

              for (var i = 0 ; i < data.length ; i++) {
                var destinationCountry = data[i].country;
                var orthodromic = data[i].ortho;

                //removeOrtho(destinationCountry);
                //drawOrtho(map, destinationCountry, orthodromic, color(i));

                //Add ortho to createAction cache
                baseAction.orthodromic[destinationCountry] = {country: destinationCountry, ortho: orthodromic, clickedLatLon: data[i].clickedLatLon};
              }
              /* FIXME copy paste

              */
              let newBase = newOriginName;
              let newBaseOrthos = compared.slice(2).map(otherCountry => baseAction.orthodromic[otherCountry]).reduce((acum, ortho) => {
                 acum[ortho.country] = ortho;
                 return acum;
               }, {});
              _moveOtherCountriesToNewBase(newBase, newBaseOrthos);

              var countryToRemove = compared[0];
              var countryToRemoveLatLng = markers[countryToRemove].getLatLng();
              shiftBase();
              removeRow(countryToRemove);

              if (undo) {
                var action = {type: "remove", country: countryToRemove, args: [countryToRemove], position: position, orthodromic: {}, latLng: countryToRemoveLatLng};
                _addAction(action);
              }
              compareButtonStatusUpdate();
              console.groupEnd();
            }
        });
      }
    } else if (compared.length == 2) {
      var countryToRemove = compared[0];
      var countryToRemoveLatLng = markers[countryToRemove].getLatLng();
      shiftBase();
      removeRow(countryToRemove);

      if (undo) {
        var action = {type: "remove", country: countryToRemove, args: [countryToRemove], position: position, orthodromic: {}, latLng: countryToRemoveLatLng};
        _addAction(action);
      }
      compareButtonStatusUpdate();
      console.groupEnd();
    } else {
      alert(`You can't remove your origin country: ${compared[0]}. Try instead to add more countries or start over from another country.`);
      console.groupEnd();
    }

    return;
  }

  var destinationCountryLatLng = markers[destinationCountry].getLatLng();
  compared.splice(position, 1);

  let currentBase = compared[0];
  removeOrtho(currentBase, destinationCountry);

  if (markers[destinationCountry] != null) {
    markers[destinationCountry].closePopup();
    markers[destinationCountry].unbindPopup();
    markers[destinationCountry].remove();
    delete markers[destinationCountry];
  }

  var arcButtonClose = document.getElementById(`arc_close_${destinationCountry}`);
  if (arcButtonClose == null) throw `No button for ${destinationCountry}`;
  arcButtonClose.parentElement.remove();
  removeRow(destinationCountry);

  if (undo) {
    var action = {type: "remove", country: destinationCountry, args: [destinationCountry], position: position, orthodromic: {}, latLng: destinationCountryLatLng };
    _addAction(action)
  }
  compareButtonStatusUpdate();

  console.groupEnd();
}

function removeRow(name) {
  console.log("Removing row")
  var index = [...Array(table.rows().data().length).keys()].findIndex(i => rowLocalizableName(table.row(i).data()) == name);
  table.row(index).remove().draw();
  console.log("Removed row")
}

function shiftBase() {
  console.group("Remove marker")
  var oldBase = compared.shift();
  var newOriginName = compared[0];

  //Move new base marker to canonical
  //var canonicalLatLon = coords[newOriginName];
  //markers[newOriginName].setLatLng(canonicalLatLon);

  //Remove arc from old base to new base
  removeOrtho(oldBase, newOriginName);

  //Remove old base marker
  if (markers[oldBase] != null) {
    markers[oldBase].remove();
    delete markers[oldBase];
  }

  //Remove button
  var arcButtonClose = document.getElementById(`arc_close_${oldBase}`);
  arcButtonClose.parentElement.remove();
  console.groupEnd();
}

function addArcButton(destinationCountry, iconUrl, closeable, position) {
  //FIXME render
  var li = document.createElement("li");
  var textNode = document.createElement("span")
  //textNode.textContent = destinationCountry;
  var img = document.createElement("img");
  img.src = iconUrl;
  img.width="16";
  img.height="16";
  var a = document.createElement("a");
  textNode.appendChild(a);
  a.textContent = destinationCountry;
  a.href = `/country/${encodeURIComponent(destinationCountry)}`;
  var closeButton = document.createElement("span")
  closeButton.id = `arc_close_${destinationCountry}`;
  closeButton.innerHTML = '&times;';
  closeButton.classList.add("closeList");
  li.appendChild(img);
  li.appendChild(textNode);
  if (closeable) {
    li.appendChild(closeButton);
  }

  let parent = document.getElementById("sourceList");
  if (position < 1) {
    parent.appendChild(li);
  } else {
    parent.insertBefore(li, parent.children[position]);
  }

  closeButton.addEventListener("click", function() {
    //var sourceName = this.parentElement.childNodes[1].textContent;
    removeArc(destinationCountry);
  });
}

//
var table = null;
function createTable(containerId, rows, buttonGroups, pageLength) {
  var pageLengths = [5, 10, 15, 20];

  console.log("Rendering table")
  table = jQuery(`#${containerId}`).DataTable({
    dom: 'Bfrtip',
    fnDrawCallback: function(settings) {
      var isFirstDraw = table == null;
      if (isFirstDraw) return;//Init

      setTimeout(() => receiveDatasetsToShow(tableCurrentPageLocalizableNames(), table.button("smoothed:name").active()), 0);
    },
    paging: true,
    pagingType: "full_numbers",
    colReorder: {
            realtime: false,
            fixedColumnsLeft: 2
        },
    lengthMenu: [
        pageLengths,
        pageLengths.map(pageLength => `${pageLength} rows`)
    ],
    pageLength: pageLength,
    scrollX: true,
    //scrollY: 200,
    scrollCollapse: true,
    autoWidth:true,
    buttons: [
        'pageLength',

        ...buttonGroups],

    //buttons: [ 'pageLength', 'columnToggle', 'selectColumns' ],
    //buttons: [ 'pageLength', 'columnToggle', 'columnVisibility', 'columnsToggle', 'columnsVisibility', 'colvis', 'colvisGroup', 'colvisRestore' ],
    columnDefs: [
      {
          targets: [0],
          className: 'dt-body-center'
      },
      {
          targets: [0, 1],
          className: 'dt-body-left'
      },
      {
          targets: "_all",
          className: 'dt-body-right'
      },
    ]
  });
  rows.forEach(addNewTableRow)

  console.log("Rendered table");
}

function addNewTableRow(rowObject) {
  if (table == null) {
      console.log("Initialization. Skip...")
      return;
  }
  var tableIndexes = [...Array(table.columns().indexes().length).keys()];
  var format = new Intl.NumberFormat(chartData["locale"], { minimumFractionDigits:2, maximumFractionDigits: 2 })
  var tableColumnNames = tableIndexes.map(i => table.column(i).header().dataset.name);
  var row = tableColumnNames.map(name => rowObject[name] || null).map(x => typeof(x) == "number" ? format.format(x): x);
  table.row.add(row).draw();
}

function tableRefresh() {
  const smoothed = table.button(".smoothed_button").active();
  const activeAlternativeButtons = table.buttons(".alternative.active");
  if (activeAlternativeButtons.length != 1) throw new Error("Unexpected active buttons");

  const activeClass = activeAlternativeButtons[0].node.className.match("view_([^ ]+)")[1];
  let allAlternatives = table.buttons(".alternative").map(x => x.node.className.match("view_([^ ]+)")[1]).toArray();
  const nonActiveClasses = allAlternatives.filter(c => c != activeClass);

  //Show regular and smoothedmode columns
  const smoothedMode = smoothed ? 'smoothed' : 'raw';
  const showSelector = `.${activeClass}.regular,.${activeClass}.${smoothedMode}`;
  table.columns(showSelector).visible(true);
  //Hide nonsmoothedmode columns
  const invertedModeHidden = smoothedMode == 'smoothed' ? 'raw' : 'smoothed';
  table.columns(`.${activeClass}.${invertedModeHidden}`).visible(false);

  //Hide non active classes
  const hideSelector = nonActiveClasses.map(c => `.${c}`).join(",");
  table.columns(hideSelector).visible(false);

  setTimeout(() => receiveDatasetsToShow(tableCurrentPageLocalizableNames(), smoothed), 0);
}

function tableCurrentPageLocalizableNames() {
  return table.rows( { page:'current', order: 'applied', search: 'applied' } )
              .data()
              .map(rowLocalizableName);
}

function rowLocalizableName(row) {
  return row[1].match(">(.+)<")[1];
}

function toggleColumn(columnName) {
  var column = table.column(`${columnName}:name`);
  column.visible(!column.visible());
  document.getElementById(`checkbox_${columnName}`).checked=column.visible();
  table.columns.adjust()
}

function toggleAll() {
  table.columns().every(i => {
    if (i > 1) {
      //skip name and flag
      var column = table.column(i);
      column.visible(!column.visible());
      var columnName = column.header().dataset.name;
      document.getElementById(`checkbox_${columnName}`).checked=column.visible();
    }
  });
  table.columns.adjust();
}
