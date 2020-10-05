define("tour", ['bootstrap', 'vendor/i18n.amd'], function(_1, i18n) {
  'use strict'

    const thisData = new WeakMap();
    function Tour(indicators, context) {
      thisData.indicators = indicators.map((i, index) => {
        i.title = i18n(`message.indicator.${index}.title`);
        i.content = i18n(`message.indicator.${index}.content`);
        return i;
      });
      thisData.context = context;
      thisData.thisTour = this;
      thisData.currentIndicatorIndex = 0;
      thisData.showTipsNextTime = true;
    }

    Tour.prototype.showTipsNextTime = function() {
      return thisData.showTipsNextTime;
    }

    Tour.prototype.setShowTipsNextTime = function(showTipsNextTime, callback = x => "") {
      thisData.showTipsNextTime = showTipsNextTime;
      const key = "showTipsNextTime";

      function get_csrf_token() {
            var cookie = document.cookie.split(";").find(x => x.includes("XSRF"))
            var splitPosition = cookie.indexOf("=")
            return cookie.substring(splitPosition + 1)
      }

      const url = `/preference/${key}/${showTipsNextTime}`
      const csrf = get_csrf_token();

      $.ajax({
        url: url,
        type: 'PUT',
        headers: {"X-XSRF-TOKEN": csrf},
        success: function(data) {
          callback();
          console.log("Preference saved");
        },
        error: function(jqXHR, textStatus, errorThrown) {
          console.error(`Unable to save preference: ${textStatus}, ${errorThrown}`);
        }
      });
    }

    Tour.wallZIndex = 200;

    Tour.prototype.gotIt = function(indicator) {
      console.log("Got it!");
      indicator.dispose(indicator, false);

      $("#wall").remove();
    }

    let templatePopover = () => `
          <div class="popover" id="myPopover" role="tooltip">
            <div class="arrow"></div>
            <h3 class="popover-header"></h3>
              <div class="popover-body">
              </div>
              <br />
              <div id="nextButton" style="position:absolute;left: 50%;transform: translate(-50%, -50%);"><button id="nextIndicatorButton" type="button" class="btn btn-success" >${i18n("popover_button_next")}</button></div>
              <br/>
              <br/>
              <div style="display: grid;" class="p-1">
                <div class="form-check text-left" >
                  <input class="form-check-input" type="checkbox" value="show" id="showTipsNextTime">
                  <label class="form-check-label" for="showTipsNextTime" style="align-self: flex-end;">
                    ${i18n("popover_show_tips_next_time")}
                  </label>
                </div>
                <div class="text-right" style="position: relative;">
                  <button id="gotIt" type="button" class="btn btn-info btn-sm">${i18n("popover_got_it")}</button>
                </div>
              </div>
            </div>


          </div>`;

    Tour.prototype.start = function(skip = 0) {
      __showWall();

      for (let i = 0 ; i < skip ; i++) {
        thisData.indicators.shift();
        thisData.currentIndicatorIndex = thisData.currentIndicatorIndex + 1;
      }
      this.nextStep();
    };

    Tour.indicadorDelayInMs = 500;

    Tour.prototype.nextStep = function() {
      if (thisData.indicators.length > 0) {
        let definition = thisData.indicators.shift();
        let indicator = __createIndicator(definition);

        console.log(`Created ${thisData.currentIndicatorIndex} ${indicator.myType()}: ${definition.title}`)
        setTimeout(() => indicator.show(), Tour.indicadorDelayInMs);
        thisData.currentIndicatorIndex++;
      } else {
        __removeWall();
      }
    }

    let __removeWall = function() {
      $("#wall").remove();
    }

    let __showWall = function() {
      $(document.body).append(`<div id="wall" style="background-color: #585858; opacity: 0.45; position:fixed;padding:0; margin:0;top:0;left:0;width: 100%;height: 100%;z-index: ${Tour.wallZIndex};"></div>`);
    }

    let __createIndicator = function(definition) {
      let type = definition.type;

      switch (type) {
        case 'modal':
          return new ModalIndicator(definition, thisData.thisTour)
          break;
        case 'popover':
          return new PopoverIndicator(definition, thisData.thisTour)
          break;
        case 'hotspot':
          return new HotspotIndicator(definition, thisData.thisTour)
          break;
        default:
          throw new Error(`Invalid indicator: ${type}`);
      }
    }

    class Indicator {
      constructor(definition, tour) {
        this.tour = tour;
        this.definition = definition;
        this.disposeFunction = () => "";
        this.initCode = this.definition.code || (() => "");
        this.disposed = false;
      }

      activeIndicatorClass = "activeIndicator";

      __validateNoPreviousIndicatorsPresent() {
        const activeIndicators = $(`.${this.activeIndicatorClass}`);
        if (activeIndicators.length > 0) {
          console.error("Active indicators", activeIndicators);
          throw new Error("Active indicators present, there shouldn't be any");
        }
      }

      myType() {
        return this.__proto__.constructor.name;
      }

      show() {
        this.__validateNoPreviousIndicatorsPresent();

        const myself = this;
        this.__onShow((indicatorElement) => {
          myself.indicatorElement = $(indicatorElement)
          myself.indicatorElement.addClass(this.activeIndicatorClass);

          //Bind next and gotIt (if any) with their handlers
          const nextButton = $("#nextButton");
          const gotItButton = $("#gotIt");

          if (nextButton.length > 0) {
            const buttonEvents = $._data(nextButton[0], "events" );
            if (buttonEvents !== undefined) console.error("Unexpected next button events", buttonEvents);
          }

          nextButton.click(e => myself.dispose(myself));
          gotItButton.click(e => myself.tour.gotIt(myself));


          //Hide next button if definition states it
          const showNextButton = (myself.definition.code != null && !(myself instanceof ModalIndicator)) || myself instanceof HotspotIndicator ? false : true;
          if (!showNextButton) {
            nextButton.addClass("d-none");

            //Show it after 20 seconds just in case user don't know what to do
            setTimeout(() => {
              if (!myself.disposed) {
                nextButton.removeClass("d-none");
              } else {
                console.log("Discarded show next button");
              }


            }, 20_000)
          }

          //showTipsNextTime
          const showTipsControl = $("#showTipsNextTime");
          showTipsControl.prop('checked', myself.tour.showTipsNextTime);
          showTipsControl.change(e => myself.tour.setShowTipsNextTime(e.target.checked));
        });

        this.__create();
        this.initCode(thisData.context, this.tour, this);
      }

      registerAdditionalDispose(disposeFunction) {
        this.disposeFunction = disposeFunction;
      }

      __create() { throw new Error("Not implemented");}

      __destroy() { throw new Error("Not implemented");}

      __onShow() { throw new Error("Not implemented");}

      dispose(myself=this, next=true) {
        console.log(`Dispose ${myself.myType()}: ${myself.definition.title}`);
        myself.disposed = true;
        myself.disposeFunction();
        myself.__destroy(myself);


        if (next)
          myself.tour.nextStep();
      }

      element() { throw new Error("Not implemented"); }
    }

    class HotspotIndicator extends Indicator {
      constructor(definition, tour) {
        super(definition, tour);

        let parentId = definition.parentId;
        let popoverTitle = definition.title;
        let popoverContent = definition.content;


        this.parentElement = $(`#${parentId}`);
        this.delegatedParentClicker = this.parentElement
        if (this.parentElement.is("button") && this.parentElement.parent().is("div")) {
          //Use wrapper (see hotspot docs about buttons and links)
          this.parentElement = this.parentElement.parent();
        }

        //1 - Hotspot parent require position relative to receive a hotspot
        this.parentElement.css("position", "relative");

        //2 - Add hotspot to parent
        let hotspotContent = `
           <span id="hotspot"
                  style="position: relative;z-index: ${Tour.wallZIndex + 2};"
                  class="highlight-spot center-y center-x"
                  >
           </span>`
        this.parentElement.append(hotspotContent);

        const myself = this;
        this.hotspotInterceptClickHandler = function(e) {


          //Don't propagate click event

          e.stopPropagation();
          e.stopImmediatePropagation();
          e.preventDefault();

          myself.dispose(myself);

          return false;
        }
        this.parentElement.click(this.hotspotInterceptClickHandler);


        //3 - attach popover to hotspot
        //template + interpolation
        this.parentElement.popover({
          template: templatePopover(),
          title: popoverTitle,
          content: popoverContent,
          html: true,
          sanitize: false,

          //container: 'body',
          trigger: "manual"});
      }

      __onShow(callback) {
        const myself = this;
        myself.parentElement.on('inserted.bs.popover', function () {
          myself.theHotspot = $("#hotspot");

          callback(myself.theHotspot);
        });

        myself.parentElement.on('shown.bs.popover', function () {
          myself.theHotspot = $("#hotspot");
          myself.theHotspot.css("z-index", Tour.wallZIndex + 1);
        });
      }

      __create() {
        this.parentElement.popover("show");
      }

      __destroy(myself) {
        myself.parentElement.popover("hide");
        myself.parentElement.popover("dispose");

        myself.theHotspot.remove();

        //Remove this handler from the parent element (added by the funky hotspot)
        myself.parentElement.off("click", myself.hotspotInterceptClickHandler);

        //Simulate click on parent element if el=label
        if (myself.delegatedParentClicker.is("label")) {
          myself.delegatedParentClicker = $(`#${myself.delegatedParentClicker.attr("for")}`);
        }

        //propagate to parent element
        const propagate = myself.definition.propagate !== undefined ? myself.definition.propagate : true;
        if (propagate) {
          myself.delegatedParentClicker.click();
        }

      }
    }

    class PopoverIndicator extends Indicator {
      constructor(definition, tour) {
        super(definition, tour);

        let parentId = definition.parentId;
        this.onTop = definition.onTop || false;
        this.parentElement = $(`#${parentId}`);

        //1 - Hotspot parent require position relative to receive a hotspot
        this.parentElement.css("position", "relative");

        //2 Add parent remark
        this.__remarkParent();

        //3 - attach popover to hotspot
        this.parentElement.popover({
          template: templatePopover(),
          title: definition.title,
          content: definition.content,
          html: true,
          sanitize: false,
          placement: definition.placement || "right",

          //container: 'body',
          trigger: "manual"
        });
      }

      __remarkParent() {
        this.parentElement.addClass("border border-danger rounded");
        this.oldZIndex = this.parentElement.css("z-index");
        if (this.onTop) {
          this.parentElement.css("z-index", Tour.wallZIndex + 2);
        }
      }

      __unremarkParent() {
        this.parentElement.removeClass("border border-danger rounded");
        if (this.onTop) {
          this.parentElement.css("z-index", this.oldZIndex);
        }
      }

      __onShow(callback) {
        //FIXME: Hack mapContainer has two popupIsShown
        //so we use a sentinel to detect double initialization
        let initialized = false;
        this.parentElement.on('inserted.bs.popover', function () {
          if (initialized) return;
          const popover = $("#myPopover")

          callback(popover);
        });

        this.parentElement.on('shown.bs.popover', function () {
          if (initialized) return;
          const popover = $("#myPopover");

          popover.css("z-index", Tour.wallZIndex + 2);
          initialized = true;
        });
      }

      __create() {
        this.parentElement.popover("show");
      }

      __destroy(myself) {
        //Remove popover
        myself.parentElement.popover("hide");
        myself.parentElement.popover("dispose");

        myself.indicatorElement.remove();

        //Remove parent remark
        myself.__unremarkParent();
      }
    }

    class ModalIndicator extends Indicator {
      constructor(definition, tour) {
        super(definition, tour);
        let parentId = definition.parentId;
        let title = definition.title;
        let content = definition.content;

        let parentElement = $(document.body);
        let template = `
            <div class="modal" id="myModal" tabindex="-1" style="z-index: ${Tour.wallZIndex + 2};width:25%;">
              <div class="modal-dialog">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title">${title}</h5>

                  </div>
                  <div class="modal-body">
                    <p>${content}</p>
                  </div>
                  <div class="modal-footer">
                    <button id="nextButton" type="button" class="btn btn-success">${i18n("modal_next")}</button>
                  </div>
                </div>
              </div>
            </div>`;
        parentElement.append(template);
        this.modal = $("#myModal");
        const myself = this;
        this.modal.on('hide.bs.modal', function(e) {
          const userPressedESCAPE = !myself.disposed;
          if (userPressedESCAPE) {
            myself.dispose();
          }
        });
      }

      __onShow(callback) {
        const modal = this.modal;
        modal.on('shown.bs.modal', function () {
          modal.css("z-index", 1050);//Tour.wallZIndex + 3);

          callback(this);
        });
      }

      __create() {
        this.modal.modal("show");
      }

      __destroy(myself) {
        myself.indicatorElement.modal("hide");
        myself.indicatorElement.modal("dispose")
        myself.indicatorElement.remove();
      }
    }

    return Tour;
});
