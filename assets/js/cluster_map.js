define('cluster_map', ["vendor/i18n.amd", "jquery", "leaflet",  "tableBstrap", "bootstrap"], function(i18n, _1, _2, _3, _4) {
  function loadCss(href) {
    const link = document.createElement("link");
    link.type = "text/css";
    link.rel = "stylesheet";
    link.href = href;
    document.getElementsByTagName("head")[0].appendChild(link);
  }

  function movePopup(event = null, checkOverlap = true) {
    let popupIsShown = thisData.popoverLatLng != null;
    if (!popupIsShown) return;

    const popup = document.getElementById(thisData.popoverId);
    // const popup = $(".popover")[0]
    const pos = thisData.popoverLatLng;//[51.505, -0.09];//[48.85, 2.35];

  	const mapContainerRelativePos = thisData.map.latLngToContainerPoint(pos);
    // const x = thisData.mapContainerPos.left + mapContainerRelativePos.x;
    // const y = thisData.mapContainerPos.top + mapContainerRelativePos.y;
    const x = mapContainerRelativePos.x;
    const y = mapContainerRelativePos.y;


    L.DomUtil.setTransform(popup, {x: x, y: y}, 1);
    const popover = $(`#${thisData.popoverId}`);//$(".popover");



    popover.popover("update");

     function overlap(el1, el2) {
       const rect1 = el1.getBoundingClientRect();
       const rect2 = el2.getBoundingClientRect();

       return !(rect1.right < rect2.left ||
                  rect1.left > rect2.right ||
                  rect1.bottom < rect2.top ||
                  rect1.top > rect2.bottom);
     }

     //First call is checkOverlap==false
     //Otherwise race condition between popover.popover("update") and overlap
     //if (!checkOverlap) return;

     var isOverlap = overlap(popover[0], document.getElementById("mapid"));
     const isHidden = popover.css("opacity") == "0"
     if (isOverlap && isHidden) {
       popover.css("opacity", "1")
     } else if (!isOverlap && !isHidden){
       popover.css("opacity", "0")
     }
  }


  let defaultOpacity = 0.65;
  let selectedOpacity = 1;
  let disabledOpacity = 0;

    let thisData = new WeakMap();
    function ClusterMap(mapId, countryEventListener, columns, clusterAndPositionByCountry, points, centroids, locale) {
      loadCss(`https://unpkg.com/leaflet@${L.version}/dist/leaflet.css`);
      loadCss(`https://cdn.datatables.net/${$.fn.dataTable.version}/css/jquery.dataTables.css`);
      loadCss(`https://cdn.datatables.net/${$.fn.dataTable.version}/css/dataTables.bootstrap4.min.css`);


      thisData.geojsonByName = {};
      thisData.countryEventListener = countryEventListener;
      thisData.columns = columns;
      thisData.clusterAndPositionByCountry = clusterAndPositionByCountry;
      thisData.points = points;
      thisData.centroids = centroids;
      thisData.mapId = mapId;
      thisData.locale = locale;

      let originPoint = [51.505, -0.09];
      let originZoom = 1;

      thisData.map = L.map(mapId, {
          scrollWheelZoom: false,
          maxBoundsViscosity: 1.0,
      }).setView(originPoint, originZoom);
      let map = thisData.map;
      thisData.mapContainerPos = document.getElementById(mapId).getBoundingClientRect();



        map.on('contextmenu', e => map.setView(originPoint, originZoom));

        map.on('move', movePopup);

        map.on('zoomend', x => movePopup(null, true));

        map.on('click', x => {
          //Clicked in no country (geojson) area ie sea, just unlock if required
          if (thisData.countryEventListener.isCountryLocked())
            thisData.countryEventListener.onCountryUnlock(null);
        })

        map.whenReady(e => $(`#${mapId}`).removeClass("bg-light"));

        const southWest = L.latLng(-89.98155760646617, -180);
        const northEast = L.latLng(89.99346179538875, 180);
        const bounds = L.latLngBounds(southWest, northEast);

        map.setMaxBounds(bounds);
        map.setMinZoom(originZoom);

        //$("#mapPopup").popover()

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          continuousWorld: false,
          maxBoundsViscosity: 1.0,
          noWrap: true,
          inertia: true,
          //bounds: [ [-90, -180],[90, 180] ]
        }).addTo(map);



        //Load geojson features
        $.getJSON({ url:`/assets/js/all.110m.json`, success: __loadFeatures});

        //Control wheel zoom interceptor
        let wheeling;
        $(`#${mapId}`).bind('wheel', function(e) {
          let zoomEnabled = map.scrollWheelZoom.enabled();
          if (!zoomEnabled) {
            if (!wheeling) {
              $("#zoomMessage").toggleClass('d-none');
            }
            clearTimeout(wheeling);

            wheeling = setTimeout(function() {
              //console.log('stop wheeling!');
              wheeling = undefined;

              $("#zoomMessage").toggleClass('d-none');
            }, 500);
          }
        });
    }

    let __fakeSquareGeojson = function(lat, lng, distanceInKm = 10) {
      let latDistance = distanceInKm / 110.574;
      let lngDistance = distanceInKm / 111.320 * Math.cos(lat / Math.PI / 180);

      return {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [ [ [lng + lngDistance, lat + latDistance], [lng - lngDistance, lat + latDistance, ], [lng - lngDistance, lat - latDistance, ], [lng + lngDistance, lat - latDistance, ] ] ]
        }
      }
    }

    function _renderMiniTable(country) {
      var f = x => (typeof x == 'number') ? x.toLocaleString(thisData.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (x || "");
      //var data = values.map(f)
      //let selectedSources = [country];
      //var columns = selectedSources.map(name => ({title: `<img width="16px" style="float: right;" src="${markerIcon(name)}">`}));


      let columns = thisData.columns;
      let [clusterId, position] = thisData.clusterAndPositionByCountry[country];
      let values = thisData.points[country];
      let centroidValues = thisData.centroids[clusterId];

      $(`#${_popupid(country)}`).DataTable( {
        paging: false,
        searching: false,
        info: false,
        lengthChange: false,
        ordering: false,
        data: columns.map((column, i) => [i18n(`message.column.${column}`), f(values[i]), f(centroidValues[i])]),//[ [country].concat(values) ],
        columns: [{title: ""}, {title: `<img width="16px" style="float: right;" src="/assets/icons/${icons[country]}.png">`}, {title: i18n("map.group", {var1: thisData.centroids.length - clusterId}) }],
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

    let chartColors = {
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
      let colorNames = Object.keys(chartColors)
      return chartColors[colorNames[i % colorNames.length]]
    }

    let __loadFeatures = function(data) {
      let featuresByIsoAlpha3 = data.features.reduce((acum, feature) => {
        acum[feature.properties.adm0_a3] = feature;
        return acum;
      }, {});

      datasets.map((dataset, i) => {
        for (let point of dataset.points) {
          let country = point.country;
          let alpha3 = point.isoAlpha3;
          let feature = featuresByIsoAlpha3[alpha3];
          if (feature == null) {
            console.log(`No country borders feature for country=${country}, isoAlpha3=${alpha3}, population=${point.population}, using a 100km2 square`);
            let [lat, lng] = countryLatLng[country];

            feature = __fakeSquareGeojson(lat, lng)
          }

          let color = colo(i);
          __buildFeature(country, feature, color);
        }
      });
    }

    let __buildFeature = function(country, feature, color) {
      let geojson = L.geoJSON(feature.geometry,
        { style: function(layer) {
            return {stroke: true, weight: 0.5, fillColor: color, fill: true, fillOpacity: defaultOpacity};
          }
      });
      thisData.geojsonByName[country] = geojson;

      geojson.addTo(thisData.map);
      geojson.bindTooltip(i18n(`country.${country}`), {sticky: true});
      // geojson.bindPopup(
      //   function (layer) {
      //     return singleCountryPopup(country);
      //   });

      // let ignoreClick = null;
      geojson
      // .on('popupopen', function(e) {
      //   console.log(`MAP on popupopen ${country} ignore`)
      //
      //   onCountryLock(country);
      // })
      // .on('popupclose', function(e) {
      //   console.log(`MAP on popupclose ${country}`);
      //   thisData.countryEventListener.onCountryUnlock(country, false);
      //   ignoreClick = new Date();
      // })
      .on('click', function(e) {
        // let now = new Date();
        // if (ignoreClick != null && (now - ignoreClick) < 50) {
        //   console.log(`MAP: ignore click, elapsed=${now - ignoreClick}`);
        //   return ;
        // };
        //
        // ignoreClick = null;

        console.log(`MAP: click ${country}`);

        thisData.countryEventListener.onCountryLock(country);

        //Dont propagate to map, country has been handled
        L.DomEvent.stopPropagation(e);
        L.DomEvent.preventDefault(e);
        L.DomEvent.stop(e);
        return false;
      })
      .on('mouseout', function(e){
        console.log(`MAP on mouseout ${country}`)

        thisData.countryEventListener.onCountryMouseOut(country, 'map');
      })
      .on('mouseover', function(e) {
        console.log(`MAP on mouseover ${country}`)

        thisData.countryEventListener.onCountryMouseOver(country, 'map');
      });
    }

    function _popupid(country) {
      let sanitized = country.replaceAll(/[^a-zA-Z]+/g, "_");
      return `popupTable${sanitized}`;
    }

    function singleCountryPopup(country) {
      let countryUrl = `/country/${encodeURIComponent(country)}`;
      return `<div class="card">
                         <h5 class="card-header">${i18n("country." + country)}</h5>
                         <div class="card-body">
                           <p class="card-text"><table id="${_popupid(country)}" class="display compact row-border" nostyle="font-size: 8px;padding: 5px;border-spacing: 0px;"></table></p>
                           <a href="${countryUrl}" class="btn btn-primary" th:text="#{table.country.info}"></a>
                         </div>
                       </div>`;
      //return `<table id="${_popupid(country)}" class="display compact row-border" nostyle="font-size: 8px;padding: 5px;border-spacing: 0px;"></table>`;
    }

    ClusterMap.prototype.doCountryLock = function(country) {
      //mapSimulateMouseOut(country);
      __showGeojson(country, 'selected');
    }

    ClusterMap.prototype.doCountryUnlock = function(country) {
      __showGeojson(country, thisData.countryEventListener.clusterState(country));
    }

    ClusterMap.prototype.simulateMouseOver = function(country, mode="over") {
      __showGeojson(country, mode);

    }

    ClusterMap.prototype.simulateMouseOut = function(country) {
      __showGeojson(country, 'out');
    }

    function __showPopup(country, geojson, latLng) {
      // geojson.bindPopup(
      //   function (layer) {
      //     return singleCountryPopup(country);
      //   });
      geojson.unbindTooltip();
      thisData.popoverLatLng = latLng;
      thisData.popoverId = "mapPopup";
      const popover = $(`#${thisData.popoverId}`).popover({title: i18n(`country.${country}`), sanitize: false, html: true, content: `<table id="${_popupid(country)}" class="display compact row-border" nostyle="font-size: 8px;padding: 5px;border-spacing: 0px;"></table>`});

      popover.on('shown.bs.popover', function (e) {

        //movePopup()
      });
      popover.popover("show");
      _renderMiniTable(country);
      movePopup(null, false)

      //geojson.openPopup(latLng);
      //_renderMiniTable(country);
    }

    function __hidePopup(geojson, country) {
      thisData.popoverLatLng = null;
      const popup = $(`#${thisData.popoverId}`)
      popup.popover('hide');
      popup.popover('dispose');
      geojson.bindTooltip(country, {sticky: true})
      // geojson.closePopup();
      // geojson.unbindPopup();

    }


    let __showGeojson = function(country, mode) {
      let geojson = thisData.geojsonByName[country];
      let color = geojson.options.style().fillColor;
      console.log(`MAP: showGeojson(${country}, ${mode})`)

      switch(mode) {
        case 'iluminate':
          geojson.setStyle({stroke: true, weight: 1, fillColor: color, fill: true, fillOpacity: selectedOpacity});
          break;
        case 'selected':
          geojson.setStyle({stroke: true, weight: 1, fillColor: color, fill: true, fillOpacity: selectedOpacity});
          console.log(`MAP: close tooltip, open popup`);
          geojson.closeTooltip();

          __showPopup(country, geojson, countryLatLng[country]);

          break;
        case 'enabled':
          geojson.setStyle({stroke: true, weight: 1, fillColor: color, fill: true, fillOpacity: defaultOpacity});
          console.log(`MAP: close tooltip, close popup`);

          __hidePopup(geojson, country);


          geojson.closeTooltip();
          break;

        case 'disabled':
          geojson.setStyle({stroke: true, weight: 1, fillColor: color, fill: true, fillOpacity: disabledOpacity});
          console.log(`MAP: close tooltip, close popup`);

          __hidePopup(geojson, country);
          break;

        case 'over':
          geojson.setStyle({stroke: true, weight: 1, fillColor: color, fill: true, fillOpacity: selectedOpacity});
          console.log(`MAP: open tooltip`);
          geojson.openTooltip();
          break;

        case 'out':
          let opacity = null;
          switch(thisData.countryEventListener.clusterState(country)) {
            case 'enabled':
              opacity = defaultOpacity;
              break;
            case 'disabled':
              opacity = disabledOpacity;
              break;
            default:
              throw new Error();
          }
          geojson.setStyle({stroke: true, weight: 1, fillColor: color, fill: true, fillOpacity: opacity});
          console.log(`MAP: close tooltip`);
          geojson.closeTooltip();
          break;


        default:
          throw new Error(`Invalid geojson mode=${event} for country=${country}`);
      }
    }

    ClusterMap.prototype.start = function() {
    }

    ClusterMap.prototype.enableZoom = function() {
      thisData.map.scrollWheelZoom.enable();
    }

    ClusterMap.prototype.disableZoom = function() {
      thisData.map.scrollWheelZoom.disable();
    }

    return ClusterMap;
});
