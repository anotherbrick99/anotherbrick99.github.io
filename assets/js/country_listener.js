define('country_listener', ['jquery'], function() {
  let thisData = new WeakMap();
  function CountryListener(datasets) {
    thisData.listeners = {};
    thisData.datasets = datasets

    let zoomEnabled = false;
    $(document).keydown(function(e) {
      if (e.which == 17) {
        console.log("ENABLE ZOOM");

        Object.keys(thisData.listeners)
          .map(key => thisData.listeners[key])
          .forEach(zoomable => zoomable.enableZoom());

        console.log("RESTORED CHART ZOOM");
        zoomEnabled = true;
      }
    });
    $(document).keyup(function(e) {
      if(e.which == 17){
        console.log("DISABLE ZOOM");

        Object.keys(thisData.listeners)
          .map(key => thisData.listeners[key])
          .forEach(zoomable => zoomable.disableZoom());

        console.log("REMOVED CHART ZOOM");
        zoomEnabled = false;
      }
    });
  }

  CountryListener.prototype.add = function(name, listener) {
    thisData.listeners[name] = listener;
  }

  let countryMouseOver = null;
  CountryListener.prototype.onCountryMouseOver =  function(country, source) {
    console.group(`COMPONENT: on country mouseover=${country}, source=${source.toUpperCase()}`);

    let alreadyOver = countryMouseOver == country;
    if (alreadyOver) {
      console.groupEnd();
      return;
    };

    if (this.isCountryLocked()) {
      console.groupEnd();
      return;
    }

    if (countryMouseOver != null) {
      //FIXME not sure
      this.onCountryMouseOut(countryMouseOver, source);
    }

    //if (geojsonByName[country] == null) return;//FIXME allow to show tooltip and maybe iluminate country and show NO DATA?

    //maptooltip done by leaflet
    //chart point size done by chartjs
    switch(source) {
      case "map":
        thisData.listeners["map"].simulateMouseOver(country);//FIXME
        thisData.listeners["chart"].simulateMouseOver(country);
        break;
      case "chart":
        thisData.listeners["map"].simulateMouseOver(country);
        //showGeojson(country, 'over');
        break;
      default:
        throw new Error(`Invalid source=${source} for onCountryMouseOver`);
    }
    callAdditionalHandlers("onCountryMouseOver", ...arguments);
    countryMouseOver = country;
    console.groupEnd();
  }

  CountryListener.prototype.onClusterMouseOver = function(clusterIndex) {
    console.group(`onClusterMouseOver ${clusterIndex}`)
    showCluster(clusterIndex, "iluminate");
    console.groupEnd();
  }

  CountryListener.prototype.onClusterMouseOut = function(clusterIndex) {
    console.group(`onClusterMouseOut ${clusterIndex}`)
    showCluster(clusterIndex, this.clusterState(clusterIndex));
    console.groupEnd();
  }

  let clusterIndexState = [];
  CountryListener.prototype.clusterState = function(clusterIndexOrCountry) {
    let clusterIndex = Number.isInteger(clusterIndexOrCountry) ? clusterIndexOrCountry : clusterAndPositionByCountry[clusterIndexOrCountry][0];
    return clusterIndexState[clusterIndex] || "enabled";
  }

  CountryListener.prototype.onClusterState = function(clusterIndex, state) {
    switch(state) {
      case "enabled" :
        break;
      case "disabled" :
        break;
      default:
        throw new Error(`Invalid cluster state=${state}`);
    }

    if (this.clusterState(clusterIndex) == state) return;

    showCluster(clusterIndex, state);
    clusterIndexState[clusterIndex] = state;
  }

  let showCluster = function(clusterIndex, mode) {//, enabled, onOpacity = defaultOpacity, offOpacity = 0) {
    console.log(`MAP: show cluster=${clusterIndex} enabled=${mode}`)
    let dataset = thisData.datasets[clusterIndex];

    for (let point of dataset.points) {
      //let alpha3 = point.isoAlpha3;
      //let feature = featuresByIsoAlpha3[alpha3];
      //let geojson = geojsonByName[point.country]

      //let fillOpacity = enabled ? onOpacity : offOpacity;
      //let color = geojson.options.style().fillColor
      //geojson.setStyle({stroke: true, weight: 0.5, fillColor: color, fill: true, fillOpacity: fillOpacity});

      thisData.listeners["map"].simulateMouseOver(point.country, mode);



    }
  }

  CountryListener.prototype.onCountryMouseOut = function(country, source) {
    console.group(`COMPONENT: on country mouseout=${country}, source=${source.toUpperCase()}, countryMouseOver=${countryMouseOver}`)

    if (countryMouseOver == null) {
      console.log(`COMPONENT discard mouse out, no countryMouseOver`)
      console.groupEnd();
      return;
    }
    //if (geojsonByName[country] == null) return;

    if (countryMouseOver != country) {
      console.log(`COMPONENT: remove tooltip for ${country} but found ${countryMouseOver}, removing anyway...`);
      country = countryMouseOver;
    }



    switch(source) {//FIXME
      case "map":
        thisData.listeners["map"].simulateMouseOut(country);
      case "map":
        thisData.listeners["chart"].simulateMouseOut(country);
        break;
      case "chart":
        thisData.listeners["map"].simulateMouseOut(country);
        //showGeojson(country, 'out');
        break;
      default:
        throw new Error(`Invalid source=${source} for onCountryMouseOver`);
    }
    countryMouseOver = null;
    console.groupEnd();
  }

  let aditionalEventHandlers = { onCountryLock : [], onCountryUnlock : [], onCountryMouseOver: []};

  CountryListener.prototype.addHandler = function(name, handler) {
    if (aditionalEventHandlers[name] == null) throw new Error(`Unexpected handler ${name}`);

    aditionalEventHandlers[name].push(handler);
  }

  CountryListener.prototype.removeHandler = function(name, handler) {
    aditionalEventHandlers[name].splice(aditionalEventHandlers[name].indexOf(handler), 1);
  }

  CountryListener.prototype.clearHandlers = function() {
    Object.keys(aditionalEventHandlers).forEach(key => aditionalEventHandlers[key].clear());
  }

  let lockedCountry = null;
  CountryListener.prototype.onCountryLock = function(country) {
    console.group(`COMPONENT: onCountryLock country=${country}`);
    let sameCountryClicked = this.isLocked(country);

    //Close previously opened country if any
    if (this.isCountryLocked()) {
      this.onCountryUnlock(lockedCountry);
      console.groupEnd();
      return;
    }

    if (sameCountryClicked) {
      console.groupEnd();
      return;
    }

    //aditionalEventHandlers["onCountryLock"].forEach(handler => handler(country))
    callAdditionalHandlers("onCountryLock", ...arguments)

    thisData.listeners["map"].doCountryLock(country);
    thisData.listeners["chart"].doCountryLock(country);
    lockedCountry = country;
    console.groupEnd();
  }

  function callAdditionalHandlers(name, ...args) {
    aditionalEventHandlers[name].forEach(handler => handler(...args))
  }

  CountryListener.prototype.onCountryUnlock = function(country) {
    console.group(`COMPONENT: onCountryUnlock country=${country}, countryLocked=${lockedCountry}`);
    if (!this.isCountryLocked()) {
      console.log(`onCountryUnlock: country=${country} but no country was locked`)
      console.groupEnd();
      return;
    }

    if (country != lockedCountry) {
      console.log(`COMPONENT: Unexpected country=${country} to unlock, current=${lockedCountry}`)
    }

    country = lockedCountry;
    lockedCountry = null;//Removed before mapOnCountryUnlock as it interferes with map.on("popupclose")
    thisData.listeners["map"].doCountryUnlock(country);
    thisData.listeners["chart"].doCountryUnlock(country);
    callAdditionalHandlers("onCountryUnlock", ...arguments)
    console.groupEnd();
  }

  CountryListener.prototype.isCountryLocked = function() {
    return lockedCountry != null;
  }

  CountryListener.prototype.isLocked = function(country) {
    return lockedCountry == country;
  }

  return CountryListener;
})
