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



async function addDatasetToChart(chart, dataset) {
  console.log(`Chart ${chart.yLabel} adding source ${dataset.label}...`);
  let oldLen = chart.data.datasets.length;
  chart.data.datasets[oldLen] = dataset;
  chart.data.datasets.length = oldLen + 1;
  chart.update();
  console.log(`Chart ${chart.yLabel} added source ${dataset.label}`);
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








//Map component






//var coords = {};



//

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
