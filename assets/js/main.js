
window.chartColors = {
	red: 'rgb(255, 99, 132)',
	orange: 'rgb(255, 159, 64)',
	yellow: 'rgb(255, 205, 86)',
	green: 'rgb(75, 192, 192)',
	blue: 'rgb(54, 162, 235)',
	purple: 'rgb(153, 102, 255)',
	grey: 'rgb(201, 203, 207)'
};

function plot(chartData, name, isDetailed) {
  var translations = chartData.translations;
  var xLabel = 'date';
  var yLabel = name;
  var xLabels = buildXLabels(chartData, xLabel);//chartData.xLabels;
  var dataToRender = Object.keys(chartData)
                      .filter(label => label.endsWith("Name"))
                      .map(name => name.replace(/Name$/, ""));
  var chartName = `chart_${name}`;
  var chart = window[chartName];
  if (chart === undefined || true) {
    var config = {
      type: 'line',
      data: {
        labels: xLabels,
        datasets: datasets(dataToRender, xLabels, xLabel, yLabel)
      },
      options: {
        responsive: true,
        onClick: x => {
          if (isDetailed) return;

          plot(chartData, name, true);
          document.getElementById("myModal").style.display = "block";
        },
        title: {
          display: true,
          text: `${translations[name]}`
        },
        tooltips: {
          mode: 'index',
          intersect: false,
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
        }
      }
    };

    createChart(chartName, isDetailed, config);
  } else {
    //config.data.datasets.push(buildDataset(destinationName, normalize(destinationData, xLabels, xLabel, yLabel), window.chartColors.blue));
    //chart.update();
  }
}

function datasets(dataToRender, xLabels, xLabel, yLabel) {
  return dataToRender.map((source, idx) => {
    var dataName = chartData[`${source}Name`];
    var dataValue = chartData[`${source}Data`];

    return buildDataset(dataName, normalize(dataValue, xLabels, xLabel, yLabel), color(idx));
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

function color(index) {
  var colorNames = ['red', 'blue', 'green', 'purple', 'orange'];
  var colorName = colorNames[index % Object.keys(window.chartColors).length];
  return window.chartColors[colorName];
}

function buildDataset(label, data, color) {
  return {  label: label,
            backgroundColor: color,
            borderColor: color,
            data: data,
            fill: false
            };
}

function normalize(data, xLabels, xLabel, yLabel) {
  var lineData = data.reduce(function(o, point) {
      o[point[xLabel]] = point[yLabel];
      return o;
      }, {});
  return xLabels.map(date => lineData[date.format("YYYY-MM-DD")] || null);
}

function createChart(chartName, isDetailed, config) {
console.log(`Create ${chartName} ${isDetailed === undefined ? 'regular' : 'detailed'}`);
  var canvas = document.createElement('canvas');
  canvas.id = 'canvas_${name}_${isDetailed}';

  var div = document.createElement('div');
  div.classList.add(isDetailed ? "detailed-chart-container" : "chart-container");
  div.appendChild(canvas);

  var parent = isDetailed ? document.getElementById('modal-container') : document.getElementById('container');
  parent.appendChild(div);

  window[chartName] = new Chart(canvas.getContext('2d'), config);
}

window.addEventListener("load", function() {
  var modal = document.getElementById("myModal");

  var closeButton = document.getElementsByClassName("close")[0];

  closeButton.onclick = function() {
    modal.style.display = "none";
  }

  window.onclick = function(event) {
    if (event.target == modal) {
      modal.style.display = "none";
      var parent = document.getElementById("modal-container");
      while (parent.firstChild) {
        parent.firstChild.remove();
      }
    }
  }
});