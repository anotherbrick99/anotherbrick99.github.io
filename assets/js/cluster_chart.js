define('cluster_chart', ['vendor/i18n.amd', "jquery", "chartjs", "zoom"], function(i18n) {
  let thisData = new WeakMap();

  let zoomEnabled = false;
  ClusterChart.prototype.enableZoom = function() {
    thisData.clusterChart.ctx.canvas.addEventListener('wheel', thisData.clusterChart.$zoom._wheelHandler);
    thisData.allowZoomBubbling = false;
    zoomEnabled = true;
  }

  ClusterChart.prototype.disableZoom = function() {
    thisData.clusterChart.ctx.canvas.removeEventListener('wheel', thisData.clusterChart.$zoom._wheelHandler);
    zoomEnabled = false;
  }

  ClusterChart.prototype.isZoomEnabled = function() {
    return zoomEnabled;
  }

  ClusterChart.pointRadius = 5;
  ClusterChart.maxPointHoverRadius = 20;

  function ClusterChart(chartId, datasets, columns, clusterAndPositionByCountry, countryEventListener) {
    thisData.countryEventListener = countryEventListener;
    thisData.clusterAndPositionByCountry = clusterAndPositionByCountry;

    datasets = datasets.map((data, i, arr) => {
      let dataset = {
        label: i18n('map.group', {var1: arr.length - i}),
        borderColor: colo(i),
        backgroundColor: Chart.helpers.color(colo(i)).alpha(0.2).rgbString(),
        pointStyle: clusterPointStyle(i),
		    pointRadius: Array(data.points.length).fill(ClusterChart.pointRadius),
		    pointHoverRadius: Array(data.points.length).fill(ClusterChart.maxPointHoverRadius),
        data: data.points,
      };

      return dataset;
    });

    let canvas = document.getElementById('canvas');//FIXME
  	let ctx = canvas.getContext('2d');

    let simulatedTooltipCountry = null;
    let clusterChart = Chart.Scatter(ctx, {
        data: {datasets: datasets},
        options: {
          responsive: true,
          title: {
            display: true,
            text: i18n('chart.title')
          },
          legend: {
            onHover: function(e, legendItem) {
              let clusterIndex = legendItem.datasetIndex;
              console.log("LEGEND over", legendItem.datasetIndex, clusterIndex)
              // var ci = this.chart;
              // var meta = ci.getDatasetMeta(clusterIndex);
              // let clusterEnabled = !meta.hidden;

              //showClusterInMap(clusterIndex, "iluminate");
              thisData.countryEventListener.onClusterMouseOver(clusterIndex);

            },
            onLeave: function(e, legendItem) {
              let clusterIndex = legendItem.datasetIndex;
              console.log("LEGEND out", legendItem.datasetIndex, clusterIndex);
              // var ci = this.chart;
              // var meta = ci.getDatasetMeta(clusterIndex);
              // let clusterEnabled = !meta.hidden;

              thisData.countryEventListener.onClusterMouseOut(clusterIndex);
              // if (clusterEnabled) {
              //   showClusterInMap(clusterIndex, "enabled");
              // } else {
              //   showClusterInMap(clusterIndex, "disabled");
              // }
            },
            onClick: function(e, legendItem) {
              var index = legendItem.datasetIndex;
              var ci = this.chart;
              var meta = ci.getDatasetMeta(index);
              meta.hidden = meta.hidden === null ? !ci.data.datasets[index].hidden : null;

              let clusterEnabled = !meta.hidden;

              if (clusterEnabled) {
                thisData.countryEventListener.onClusterState(index, "enabled");
              } else {
                thisData.countryEventListener.onClusterState(index, "disabled");
              }

              ci.update();
            }
          },
          events : ['mouseout', 'mousemove', 'click'],
          onHover: function(event, element) {
            let simulated = event.simulated || false;
            let country = null;
            if (simulated) {
              country = event.country;
            } else if (element.length == 1) {
              let datasetIndex = element[0]._datasetIndex;
              let index = element[0]._index;
              country = clusterChart.data.datasets[datasetIndex].data[index].country;
            }
            //console.log(`CHART: ONHOVER: EVENT=${event.type}, simulated=${simulated}, country=${country}`)
            //console.log("element", element)

            if (event.type == "mouseout" && simulated && simulatedTooltipCountry != null) {
              console.log(`CHART: remove simulatedTooltipCountry`)
              simulatedTooltipCountry = null;
            } else if (event.type == "mousemove") {
              if (simulated) {
                //it is a simulated mouse over
                simulatedTooltipCountry = event.country;
              } else {
                if (element.length == 0) {
                  //mouseout
                  thisData.countryEventListener.onCountryMouseOut(simulatedTooltipCountry, 'chart');
                  // if (simulatedTooltipCountry != null) {
                  //   //hack to trigger tooltip with the right country
                  //   //no using x, y (multiple points)
                  //   onCountryMouseOut(simulatedTooltipCountry, 'chart');
                  //   simulatedTooltipCountry = null;
                  // } else {
                  //   //No mouse over before, mouse was and is on an empty area
                  //   //console.log(`CHART: discard mouseout`)
                  // }
                } else if (element.length == 1) {
                  //mouse over
                  thisData.countryEventListener.onCountryMouseOver(country, 'chart');
                } else {
                  //Several points mouse over (should't pass due to tooltip mode=single)
                  let mouseOverCountries = element.map(x => {
                    let datasetIndex = element[0]._datasetIndex;
                    let index = element[0]._index;
                    return clusterChart.data.datasets[datasetIndex].data[index].country;
                  }).join(", ")
                  console.log(`CHART: unexpected mouseover serveral points: ${mouseOverCountries}`);
                }
              }

              /*

              let mouseOverOnePoint = element.length == 1;

              if (mouseOverOnePoint) {
                if (!simulated) {
                  //Real event, not generated from map, propagate
                  let datasetIndex = element[0]._datasetIndex;
                  let index = element[0]._index;
                  let country = clusterChart.data.datasets[datasetIndex].data[index].country;

                  onCountryMouseOver(country, 'chart');
                }
              }

              //Don't do clever things when a country is already locked
              if (lockedCountry != null) return;


              if (element.length == 0) {
                if (simulatedTooltipCountry != null) {
                  onCountryMouseOut(simulatedTooltipCountry, 'chart');
                  simulatedTooltipCountry = null;
                  //console.log(`CHART: simulated mouseout country=${simulatedTooltipCountry}`)
                } else {
                  console.log(`CHART: discard mouseout`)
                }
              } else if (element.length == 1) {
                let oldSimulatedTooltipCountry = simulatedTooltipCountry;

                if (simulated) {
                  simulatedTooltipCountry = event.country;
                } else {
                  let datasetIndex = element[0]._datasetIndex;
                  let index = element[0]._index;
                  simulatedTooltipCountry = clusterChart.data.datasets[datasetIndex].data[index].country;
                }

                if (simulatedTooltipCountry != oldSimulatedTooltipCountry) {
                  console.log(`CHART: simulated mouseover ${simulatedTooltipCountry}`)
                  onCountryMouseOver(simulatedTooltipCountry, 'chart');
                } else {
                  //console.log(`CHART: simulated mouseover ${simulatedTooltipCountry}, already in. IGNORED`)
                }
              } else if (element.length > 1) {
                console.log("CHART: UNEXPECTED HOVER WITH SEVERAL POINTS", element)
              }
              */
            } else if (event.type == "click") {
              //Click is not simulated
              let clickedEmptyArea = element.length == 0;
              let clickedInPoint = element.length == 1;

              if (clickedEmptyArea) {
                thisData.countryEventListener.onCountryUnlock(null);//unlock if any
              } else if (clickedInPoint) {
                // let datasetIndex = element[0]._datasetIndex;
                // let index = element[0]._index;
                // let clickedCountry = clusterChart.data.datasets[datasetIndex].data[index].country;

                thisData.countryEventListener.onCountryLock(country);
              } else {
                let mouseOverCountries = element.map(x => {
                  let datasetIndex = element[0]._datasetIndex;
                  let index = element[0]._index;
                  return clusterChart.data.datasets[datasetIndex].data[index].country;
                }).join(", ")
                console.log(`CHART: unexpected click several points: ${mouseOverCountries}`);
              }
            }
          },
          tooltips: {
            //mode: 'nearest',
            mode: 'single',
            //intersect: true,
            //mode: 'index',
            //intersect: false,
            //itemSort: (a, b, data) => b.value - a.value,
            callbacks: {
                title: function(tooltipItem, data) {
                  let country = null;
                  let simulatedEvent = simulatedTooltipCountry != null;
                  if (simulatedEvent) {
                    country = simulatedTooltipCountry
                  } else {
                    if (tooltipItem.length != 1) {
                      console.log(tooltipItem)
                      throw new Error("")
                    }
                    tooltipItem = tooltipItem[0]
                    country = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index].country;
                  }
                  return country;
                },
                label: function(tooltipItem, data) {
                //console.log("tooltipitem", tooltipItem)
                //console.log("data", data)
                  let country = null;
                  let simulatedEvent = simulatedTooltipCountry != null;
                  if (simulatedEvent) {
                    country = simulatedTooltipCountry
                  } else {
                    country = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index].country;
                  }
                  console.log(`CHART: mouseover country=${country} ${simulatedEvent ? 'SIMULATED' : ''}`);

                  //remarkCountry(country, true);
                  let point = columns.map((column, i) => `${column}: ${points[country][i]}`).join(", ")
                  //return `${point}`
                  return null;
                    //return `${data.datasets[tooltipItem.datasetIndex].label}: ${data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index].toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                }
            }
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
      });

    //canvas.chart = clusterChart;
    clusterChart.ctx.canvas.removeEventListener('wheel', clusterChart.$zoom._wheelHandler);
    thisData.clusterChart = clusterChart;

    let wheeling;
    let tt = this;
    $(canvas).bind('wheel', function(e) {
    console.log("zoom chartjs");

      if (!tt.isZoomEnabled()) {
        if (!wheeling) {
          $("#chartZoomMessage").toggleClass('d-none');
        }
        clearTimeout(wheeling);

        wheeling = setTimeout(function() {
          console.log('stop wheeling!');
          wheeling = undefined;

          $("#chartZoomMessage").toggleClass('d-none');
        }, 500);
      } else {
        //console.log("OKOK");
        //clusterChart.$zoom._wheelHandler(e);
        //return true;
      }
    });


    function zoomOut(ev) {
      thisData.clusterChart.resetZoom();
      if(thisData.allowZoomBubbling) return true;

      ev.stopPropagation();
      ev.stopImmediatePropagation();
      ev.preventDefault();

      return false;
    }

    canvas.addEventListener('contextmenu', zoomOut, false);
  }

  ClusterChart.prototype.setAllowZoomBubbling = function(allow) {
    thisData.allowZoomBubbling = allow;
  }

  ClusterChart.prototype.canvas = function() {
    return thisData.clusterChart.ctx.canvas;
  }

  ClusterChart.prototype.doCountryLock = function(country) {
    console.log(`CHART: country=${country} lock`)
    let [clusterIndex, index] = clusterAndPositionByCountry[country];
    let clusterChart = thisData.clusterChart;
    clusterChart.data.datasets[clusterIndex].pointRadius[index] = ClusterChart.maxPointHoverRadius * 2;
    clusterChart.data.datasets[clusterIndex].pointHoverRadius[index] = ClusterChart.maxPointHoverRadius * 2;
    clusterChart.update();
  }

  ClusterChart.prototype.doCountryUnlock = function(country) {
    console.log(`CHART: country=${country} unlock`);
    let [clusterIndex, index] = clusterAndPositionByCountry[country];
    let clusterChart = thisData.clusterChart;
    clusterChart.data.datasets[clusterIndex].pointRadius[index] = ClusterChart.pointRadius;
    clusterChart.data.datasets[clusterIndex].pointHoverRadius[index] = ClusterChart.maxPointHoverRadius;
    clusterChart.update();
  }

  ClusterChart.prototype.simulateMouseOver = function(country) {
    _chartPointHover(country, 'mousemove');
  }

  ClusterChart.prototype.simulateMouseOut = function(country) {
    _chartPointHover(country, 'mouseout');
  }

  function clusterPointStyle(i) {
    var pointStyles = [
      'circle',
      'star',
      'triangle',
      'cross',
      'crossRot',
      'dash',
      'line',
      'rect',
      'rectRounded',
      'rectRot',
    ];

    return pointStyles[i % pointStyles.length];
  }

  ClusterChart.chartColors = {
    //red: 'rgb(255, 99, 132)',
    red: 'rgb(227, 0, 34)',//red cadmium
    //orange: 'rgb(255, 159, 64)',
    orange: 'rgb(255,126,0)',
    //yellow: 'rgb(255, 205, 86)',
    yellow: 'rgb(255,191,0)',
    //blue: 'rgb(54, 162, 235)',
    blue: 'rgb(0,72,186)',
    //green: 'rgb(75, 192, 192)',
    green: 'rgb(132,222,2)',
    purple: 'rgb(153, 102, 255)',
    grey: 'rgb(201, 203, 207)'
  };

  function colo(i) {
    let colorNames = Object.keys(ClusterChart.chartColors)
    return ClusterChart.chartColors[colorNames[i % colorNames.length]]
  }

	let _chartPointHover = function(country, eventType) {
	  let [clusterIndex, countryIndex] = thisData.clusterAndPositionByCountry[country];
    let clusterChart = thisData.clusterChart;
	  let point = clusterChart.getDatasetMeta(clusterIndex).data[countryIndex].getCenterPoint();
	  let rect = clusterChart.canvas.getBoundingClientRect();
	  let node = clusterChart.canvas;

    //Simulate hover
    //FIXME intersect problem, it selects another point at the same point
    //so we store country in the event (monkey patching)
	  let evt = new MouseEvent(eventType, {
      clientX: rect.left + point.x,
      clientY: rect.top + point.y,
    });
    console.log(`SIMULATE ${evt.type}`)
    evt.simulated = true;
    evt.country = country;
    //console.log(`MAP: Simulate event ${evt.type} for country=${evt.country}`)
    node.dispatchEvent(evt);
	}

  return ClusterChart;
});
