define('country/chart', ['chartjs', 'zoom', 'chartjsAdapter'], function() {

  var loadEvents = false;

  function MyChart() {
    if (!loadEvents) {
    //window.addEventListener("load", function() {
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
    //});
      loadEvents = true;
    }
  }

  function sameElements(arr1, arr2) {
      if (arr1.length !== arr2.length) return false;
      return arr1.every(x => arr2.includes(x));
  }

  var xLabels = null;
  MyChart.prototype.plot = function(chartData, smoothed, name, datasetLabels, isDetailed) {
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
            this.plot(chartData, miniSmooth, name, miniDatasets, true);
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

  var updateQueue = [];
  MyChart.prototype.receiveDatasetsToShow = async function(datasetLabels, smoothed) {
    let dataNames = Object.keys(datasetLabels).filter(k => k.match("^[0-9]+$")).map(k => datasetLabels[k]);
    updateQueue.push(dataNames);
    console.log(`Update datasets to show: ${dataNames.join(", ")}`)
    if (updateQueue.length > 1) {
      console.log(`Already updating, added update request. Queue size=${updateQueue.length}, requested=${dataNames,join(", ")}`);
      return;
    }
    let label = `Update charts`;
    console.group(label);
    console.time(label);

    window.requestAnimationFrame(() => showProgressBar("Updating charts..."), 0);

    var charts = getCharts();

    console.log(`Process request, charts to update=${charts.length}`)
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
        console.log("Check queue")
        if (updateQueue.length > 1) {
          updateQueue.pop();
          index = 0;
          i = 0;
          console.log("RESTART DETECTED");
          //continue;
        } else {
          if (i == charts.length - 1) {
//                console.log("Last chart and pop from queue")
//                updateQueue.pop();
//                requestAnimationFrame(() => hideProgressBar());
//                console.timeEnd(label);
//                console.groupEnd();
//                //Race condition
//                if (updateQueue.length > 0) i = 0;
          }
        }


      }, 0);
    }
    console.log(`Last chart and pop from queue: (should be size=1) size=${updateQueue.length}`)
                    updateQueue.pop();
                    requestAnimationFrame(() => hideProgressBar());
                    console.timeEnd(label);
                    console.groupEnd();
//                    //Race condition
//                    if (updateQueue.length > 0) i = 0;
  }

  function getCharts() {
    return Object.keys(chartsByName)
            .map(key => chartsByName[key]);
  }

  function buildXLabels(chartData, xLabel) {
    var all = Object.keys(chartData)
          .filter(label => label.endsWith("Data"))
          .map(label => chartData[label])
          .reduce((arr, data) => arr.concat(data), [])
          .map(point => moment(point[xLabel]));
    return Array.from(new Set(all)).sort((a, b) => a - b);
  }

  MyChart.prototype.addChartDataset = function(country, dataPoints, color) {
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


  return MyChart;
});