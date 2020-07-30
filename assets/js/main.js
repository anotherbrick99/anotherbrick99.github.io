console.logCopy = console.log.bind(console);

console.log = function(...data)
{
    var currentDate = moment().format("HH:mm:ss.SSS") + ': ';
    this.logCopy(currentDate, ...data);
};

function call_after_DOM_updated(fn) {
    intermediate = function () {window.requestAnimationFrame(fn)}
    window.requestAnimationFrame(intermediate)
}
//

function notify(percentage, description) {
  var pleaseWait = $('#pleaseWaitDialog');
  var progressDescription = $('#progressDescription');
  var progressBar = $('.progress-bar');
  console.log(percentage, description)

    progressBar.css('width', percentage+'%').attr('aria-valuenow', percentage);
    progressBar.text(`${Math.trunc(percentage)}%`)
    if (description != null) {
      progressDescription.text(description)
    }
}

function showPleaseWait(title) {
    $('#progressTitle').text(title);
    notify(0);
    $('#cover').show();
};

function hidePleaseWait() {
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
//

function getCharts() {
  return Object.keys(chartsByName)
          .map(key => chartsByName[key]);
}
async function addChartDataset(country, dataPoints, color) {
  getCharts().map(async chart => {
    var dataName = country;
    var isMainDataset = false;
    var xLabels= chart.xLabels;
    var xLabel = chart.xLabel;
    var yLabel = chart.yLabel;
    var dataset = buildDataset(country, yLabel, normalize(dataPoints, xLabels, xLabel, yLabel), color, isMainDataset);
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
async function receiveDatasetsToShow(datasetLabels) {
  updateQueue.push("");
  if (updateQueue.length > 1) {
    console.log(`Already updating, added update request. Queue size=${updateQueue.length}`);
    return;
  }

  window.requestAnimationFrame(() => showPleaseWait("Updating charts..."), 0);

  var charts = getCharts();

  for (let i = 0 ; i < charts.length ; i++) {
    let chart = charts[i];

    setTimeout(() => {
      requestAnimationFrame( () => notify((i + 0.5)/charts.length * 100, `Loading ${chart.yLabel}...`))
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
              requestAnimationFrame(() => hidePleaseWait());
              console.log("Updated charts");
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
function plot(chartData, name, datasetLabels, isDetailed) {
  var translations = chartData.translations;
  var xLabel = 'date';
  var yLabel = name;
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
      //normalized: true,
      data: {
        labels: xLabels,
        datasets: selectedDatasets
      },
      options: {
        //animation: false,
        //elements: {
        //    line: {
        //        tension: 0, // disables bezier curves,
        //        fill: false,
        //        stepped: false,
        //        borderDash: []
        //    }
        //},
        responsive: true,
        onClick: x => {
          if (isDetailed) return;

          var miniDatasets = chartsByName[`chart_${name}_mini`].config.data.datasets.map(x => x.label)
          plot(chartData, name, miniDatasets, true);
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
  //}
}

function datasets(dataToRender, xLabels, xLabel, yLabel) {
  return dataToRender.map((source, idx) => {
    var dataName = chartData[`${source}Name`];
    var dataValue = chartData[`${source}Data`];
    var color = chartData[`${source}Color`]

    var isMainDataset = idx == 0;
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
  return xLabels.map(date => lineData[date.format("YYYY-MM-DD")] || null);
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


//
var map = null;
var mapPopup = { closed: moment() };
async function drawMap(originName, originPoint, onClickHandler) {
  console.log("Rendering map");
  map = L.map('mapid').setView(originPoint, 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    continuousWorld: false,
    noWrap: true,
    inertia: true,
    //bounds: [ [-90, -180],[90, 180] ]
  }).addTo(map);
  //map.setMaxBounds(map.getBounds());
  map.setMaxBounds([ [-90, -180],[90, 180] ]);

  map.panTo(originPoint);

  var lastLatLon = null;
  map.on('contextmenu', function(e) { map.setView(originPoint, 2); });

  map.on('click', async function(e) {
    //*1 hack
    if (mapPopup.closed != null && moment() - mapPopup.closed < 50) {
      return;
    }
    var clickedLatLon = e.latlng;
    await onClickHandler(clickedLatLon);
  });

  //FIXME: hack to cancel leaflet click bubling when closing popup
  //view *1
  //Leaflet does not allow to stop event propagation
  map.on('popupclose', e => mapPopup.closed = moment());

  console.log("Rendered map");
  return map;
}

async function countryArcOnClickHandler(clickedLatLon) {
  var sourceOrigin = compared[0];
  $.ajax({ url:`/query?lat0=${clickedLatLon.lat}&lon0=${clickedLatLon.lng}&source=${sourceOrigin}`,
      success: async function(theData) {
        var data = theData[0];
        if (compared.includes(data.country)) {
          if (compared[0] != data.country) {
            removeArc(data.country);
          } else {
            //Do nothing
          }

          return;
        }

        if (data != null && data.country != null) {
          var orthodromic = data.ortho;
          var country = data.country;
          var iconName = data.icon;
          var canonicalCountryCoords =  L.latLng(data.latLon.lat, data.latLon.lon);
          var rowObject = data.row;
          var dataset = data.dataset;
          var tableIndexes = [...Array(table.columns().indexes().length).keys()];
          var tableColumnNames = tableIndexes.map(i => table.column(i).header().dataset.name);

          chartData[country] = data.dataset;


          var countryColor = color(compared.length);
          await addChartDataset(country, dataset, countryColor);
          var row = tableColumnNames.map(name => rowObject[name] || null);
          table.row.add(row).draw();

          addArc(country, clickedLatLon, canonicalCountryCoords, orthodromic, iconName, countryColor);
        } else {
          console.warn(`No country for lat=${clickedLatLon.lat}, lon=${clickedLatLon.lng}`);
        }
      }
  });
}

var arcs = {};
var markers = {};
var compared = [];

function drawOrtho(map, country, orthodromic, arcColor) {
  arcs[country] = L.geoJSON(orthodromic, { style: {color: arcColor} }).addTo(map);
}

function iconUrl(iconName) {
  return `https://static.safetravelcorridor.com/assets/icons/${iconName}.png`;
}

var coords = {};
function addArc(country, clickedLatLon, canonicalLatLon, orthodromic, iconName, color, closeableButtons=true, comparable=true) {
  coords[country] = canonicalLatLon;
  if (orthodromic != null) {
    drawOrtho(map, country, orthodromic, color);
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
    compared.push(country);
  }

  addArcButton(country, iconUrl(iconName), closeableButtons);
}

function _popupid(country) {
  let sanitized = country.replaceAll(/[^a-zA-Z]+/g, "_");
  return `popupTable${sanitized}`;
}

function _renderMiniTable(...selectedSources) {

  var lastPoints = selectedSources.map(name => chartData[name])
                           .map(sourceAllPoints => sourceAllPoints.slice(-1)[0]);

  var columnSelection = ['date', 'new_cases_per_million', 'new_deads_per_million', 'total_cases_per_million', 'total_deads_per_million'];
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
  $.ajax({ url:`/query?lat0=${clickedLatLon.lat}&lon0=${clickedLatLon.lng}&source=europe`,
      success: async function(theData) {
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

function removeArc(destinationCountry) {
  console.log("Removing arc")
  if (compared.length == 1 || compared[0] == destinationCountry) {
    if (compared.length > 2) {
      var newOriginName = compared[1];
      var subQuery = compared.slice(2)
        .map(destination => markers[destination].getLatLng())
        .map((latLon, i) => `lat${i}=${latLon.lat}&lon${i}=${latLon.lng}` ).join("&");
      var query = `/query?source=${newOriginName}&${subQuery}`;
      $.ajax({ url:query,
          success: function(data) {
            //Move arcs to new base
            for (var i = 0 ; i < data.length ; i++) {
              var destinationCountry = data[i].country;
              var orthodromic = data[i].ortho;
              var arcColor = arcs[destinationCountry].color;
              arcs[destinationCountry].remove();
              drawOrtho(map, destinationCountry, orthodromic, color(i));
            }

            var countryToRemove = compared[0];
            shiftBase();
            removeRow(countryToRemove);
          }
      });
    } else if (compared.length == 2) {
      var countryToRemove = compared[0];
      shiftBase();
      removeRow(countryToRemove);
    } else {
      alert(`You can't remove your origin country: ${compared[0]}. Try instead to add more countries or start over from another country.`);
    }
    return;
  }

  compared.splice(compared.indexOf(destinationCountry), 1);

  if (arcs[destinationCountry] != null) {
    arcs[destinationCountry].remove();
    arcs[destinationCountry] = null;
  }

  if (markers[destinationCountry] != null) {
    markers[destinationCountry].closePopup();
    markers[destinationCountry].unbindPopup();
    markers[destinationCountry].remove();
    markers[destinationCountry] = null;
  }

  var arcButtonClose = document.getElementById(`arc_close_${destinationCountry}`);
  arcButtonClose.parentElement.remove();
  removeRow(destinationCountry);
  console.log("Removed arc")
}

function removeRow(name) {
  console.log("Removing row")
  var index = [...Array(table.rows().data().length).keys()].findIndex(i => rowLocalizableName(table.row(i).data()) == name);
  table.row(index).remove().draw();
  console.log("Removed row")
}

function shiftBase() {
  console.log("Removing marker")
  var oldBase = compared.shift();
  var newOriginName = compared[0];

  //Move new base marker to canonical
  var canonicalLatLon = coords[newOriginName];
  markers[newOriginName].setLatLng(canonicalLatLon);

  //Remove arc from old base to new base
  arcs[newOriginName].remove();
  arcs[newOriginName] = null;
  //Remove old base marker
  markers[oldBase].remove();
  markers[oldBase] = null;

  //Remove button
  var arcButtonClose = document.getElementById(`arc_close_${oldBase}`);
  arcButtonClose.parentElement.remove();
  console.log("Removed marker")
}

function addArcButton(destinationCountry, iconUrl, closeable=true) {
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
  document.getElementById("sourceList").appendChild(li);

  closeButton.addEventListener("click", function() {
    //var sourceName = this.parentElement.childNodes[1].textContent;
    removeArc(destinationCountry);
  });
}

//
var table = null;
function createTable(containerId, buttonGroups, pageLength) {
  var pageLengths = [5, 10, 15, 20];

  console.log("Rendering table")
  table = jQuery(`#${containerId}`).DataTable({
    dom: 'Bfrtip',
    fnDrawCallback: async function(settings) {
      var isFirstDraw = table == null;
      if (isFirstDraw) return;//Init

      setTimeout(() => receiveDatasetsToShow(tableCurrentPageLocalizableNames()), 0);
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

  table.on( 'buttons-action.dt', function( e, buttonApi, dataTable, node, config ) {
    if (!config.className.includes("colvisGroup")) {
      return
    }
    dataTable.buttons("button.dt-button.buttons-colvisGroup").active(false)
    buttonApi.active(true);
  });
  console.log("Rendered table");
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