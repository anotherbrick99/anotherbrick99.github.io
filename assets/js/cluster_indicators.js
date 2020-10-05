define('cluster_indicators', [], function() {
  function toast(id, title, content, removePrevious=false, time="Just now!") {
    if (removePrevious) {
      $(".toast").toast("dispose");
      $(".toast").remove();
    }

    let toastId = `toast_${(new Date).getTime()}`;
    let template = `<div id="${toastId}" class="toast" style="position: absolute; top: 0; right: 0;" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header">
                  <!--img src="..." class="rounded mr-2" alt="..."-->
                  <strong class="mr-auto">${title}</strong>
                  <small class="text-muted">${time}</small>
                  <button type="button" class="ml-2 mb-1 close" data-dismiss="toast" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                  </button>
                </div>
                <div class="toast-body">${content}</div>
              </div>`


    $(`#${id}`).append(template);
    const thisToast = $(`#${toastId}`)
    thisToast.toast({delay: 2000})
    thisToast.on("hidden.bs.toast", function(e) {
      thisToast.toast("dispose");
      thisToast.remove();
    })

    thisToast.toast('show');

    thisToast.on("shown.bs.toast", function(e) {
      const thisToast = e.currentTarget;
      const prevToasts = $(".toast").toArray()
        .filter(t => {
          return t.id < thisToast.id;
        })
        .sort(function(a, b) { return a.id < b.id});

      const currentHeight = thisToast.getBoundingClientRect().height;

      const toastDistance = 10;
      if (prevToasts.length > 0) {
        let offset =  currentHeight + toastDistance;
        const maxAdditionalToastsShown = 1;
        prevToasts.forEach((t, i) => {
          if (i < maxAdditionalToastsShown) {
            let box = t.getBoundingClientRect();
            $(t).css("top", offset)
            offset += box.height + toastDistance;
          } else {
            $(t).toast("dispose");
            $(t).remove();
          }
        });
      }
    })


  }


  let indicators = [
  {
    parentId: "",
    type: "modal",
  },
  {
    parentId: "",
    type: "modal",
  },


  {
    parentId: "initialClusteringSettingsValue",
    type: "popover",
  },
  //chart
  {
    parentId: "chartContainer",
    type: "popover",
    placement: "top",
  },
  {
    parentId: "mapContainer",
    type: "popover",
    placement: "top",
  },
  {
    parentId: "clusters",
    type: "popover",
    placement: "top",
  },
  {
    parentId: "chartContainer",
    type: "popover",
    onTop: true,
    placement: "top",
    code: function (context, tour, indicator) {
      let zoomTriggered = false;
      function zoomCapture(e) {
        if (context.chart.isZoomEnabled()) {
          toast("chartContainer", 'Zoom conseguido&nbsp<i class="fa fa-check" style="color: green;"></i>', "Has aprendido a usar el zoom, ya puedes soltar el boton control para continuar", true)
          zoomTriggered = true;
        } else {
          toast("chartContainer", "Zoom", "No olvides de pulsar la tecla control de tu teclado")
        }
      }


      let wheelListenerElement = context.chart.canvas();
      wheelListenerElement.addEventListener('wheel', zoomCapture);

      function controlKeydownCapture(event) {
        if (event.isComposing || event.keyCode === 17) {
          toast("chartContainer", "Zoom", "Enhorabuena, ya has pulsado Control, ahora mantelo pulsado y usa la rueda del ratón.")
        }
      }

      let controlReleasedAfterZoom = false;
      function controlKeyupCapture(event) {
        const controlReleasedAfterZoom = (event.isComposing || event.keyCode === 17) && zoomTriggered;

        if (controlReleasedAfterZoom) {
          indicator.dispose();
        } else {
          toast("chartContainer", "Zoom", "No has hecho zoom, vuelve a pulsar", true)
        }
      }
      document.addEventListener("keyup", controlKeyupCapture);
      document.addEventListener("keydown", controlKeydownCapture);

      indicator.registerAdditionalDispose(() => {
        wheelListenerElement.removeEventListener('wheel', zoomCapture);
        document.removeEventListener("keyup", controlKeyupCapture);
        document.removeEventListener("keydown", controlKeydownCapture);
      })
    }
  },
  {
    parentId: "chartContainer",
    type: "popover",
    onTop: true,
    code: function (context, tour, indicator) {
      let element = context.chart.canvas();

      function zoomOutInteractionDetected(ev) {
        toast("chartContainer", 'Zoom inicial&nbsp<i class="fa fa-check" style="color: green;"></i>', "Has aprendido a usar el zoom", true);
        indicator.dispose();


        ev.stopPropagation();
        ev.stopImmediatePropagation();
        ev.preventDefault();

        return false;
      }
      element.addEventListener('contextmenu', zoomOutInteractionDetected, false);
      context.chart.setAllowZoomBubbling(true);

      indicator.registerAdditionalDispose(() => {
        element.removeEventListener('contextmenu', zoomOutInteractionDetected, false);
        context.chart.setAllowZoomBubbling(false);
      });
    }
  },
  {
    parentId: "chartContainer",
    type: "popover",
    onTop: true,
    placement: "top",
    code: function(context, tour, indicator) {
      let numberOfVisitedCountries = 0;
      function f(country) {
        numberOfVisitedCountries++;
        toast("chartContainer", 'Visita a país&nbsp<i class="fa fa-check" style="color: green;"></i>', `Enhorabuena has visitado ${country}, ${numberOfVisitedCountries} de 5`)

        if (numberOfVisitedCountries >= 5) {
          indicator.dispose();
        }

      }

      const countryListener = context.countryListener;
      countryListener.addHandler("onCountryMouseOver", f);
      indicator.registerAdditionalDispose(() => {
        countryListener.removeHandler("onCountryMouseOver", f);
      })
    }
  },
  {
    parentId: "chartContainer",
    type: "popover",
    onTop: true,
    placement: "top",
    code: function(context, tour, indicator) {
      function f(country) {
        toast("chartContainer", 'Country lock&nbsp<i class="fa fa-check" style="color: green;"></i>', `Enhorabuena, has desplegago la información de ${country}`, true)

        indicator.dispose();
      }

      const countryListener = context.countryListener;
      countryListener.addHandler("onCountryLock", f);
      indicator.registerAdditionalDispose(() => {
        countryListener.removeHandler("onCountryLock", f);
      })
    }
  },

  {
    parentId: "chartContainer",
    type: "popover",
    onTop: true,
    placement: "top",
    code: function(context, tour, indicator) {
      function f(country) {
        toast("chartContainer", 'Country lock&nbsp<i class="fa fa-check" style="color: green;"></i>', `Enhorabuena, has cerrado la información de ${country}`, true)
        indicator.dispose();
      }

      const countryListener = context.countryListener;
      countryListener.addHandler("onCountryUnlock", f);
      indicator.registerAdditionalDispose(() => {
        countryListener.removeHandler("onCountryUnlock", f);
      });
    }
  },

  {
    parentId: "mapContainer",
    type: "popover",
    onTop: true,
  },

  //Search
  {
    parentId: "clusterShowControlsButton",
    type: "hotspot",
  },
  {
    parentId: "",
    type: "modal",
  },
  {
    parentId: "columns_2_hospital_beds_per_thousand_label",
    type: "hotspot",
  },
  {
    parentId: "columns_2_hospital_beds_per_thousand_label",
    type: "popover",
  },
  {
    parentId: "columns_1_new_deaths_per_million_label",
    type: "hotspot",
  },
  {
    parentId: "deltaClusteringSettings",
    type: "popover",
  },
  {
    parentId: "columns_4_gdp_per_capita_label",
    type: "hotspot",
  },
  {
    parentId: "clusterSubmitButton",
    type: "hotspot",
    propagate: false,
  },
  {
    parentId: "",
    type: "modal",
    code: function(context, tour, indicator) {
      indicator.registerAdditionalDispose(() => {
        const refresh = () => window.location.href = window.location.href;
        tour.setShowTipsNextTime(false, refresh);
      })
    }
  },
  ];

  return indicators;
})
