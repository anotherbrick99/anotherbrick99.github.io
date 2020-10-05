define('cluster_control', ['vendor/i18n.amd', "tableBstrap"], function(i18n) {
  function loadCss(href) {
    const link = document.createElement("link");
    link.type = "text/css";
    link.rel = "stylesheet";
    link.href = href;
    document.getElementsByTagName("head")[0].appendChild(link);
  }

  const thisData = new WeakMap();
  function ClusterControl() {
    const datatableVersion = $.fn.dataTable.version;
    loadCss(`https://cdn.datatables.net/${datatableVersion}/css/jquery.dataTables.css`);

    thisData.clusterInitialSettings = currentSettings();
    updateSettings();
    thisData.settingsChanged = false;

    $("form input").change(processSettingChange);

    jQuery(`#clusters`).DataTable({
      dom: 'Bfrtip',
      "order": [ [ 1, "desc" ] ],
      buttons: [],
      paging: false,
      language: {
          search: i18n('table.search')
      }
    });

    $('#collapseClusteringControls').on('shown.bs.collapse', function () {
      $("#clusterShowControlsButton").text("Ocultar");
      //$('#initialClusteringSettings').addClass('d-none');
    })

    $('#collapseClusteringControls').on('hidden.bs.collapse', function () {
      //updateSettings();
      $("#clusterShowControlsButton").text("Cambiar parametros");
      //$('#initialClusteringSettings').removeClass('d-none');
    })
  }

  function updateSettings() {
    let selectedCheckboxes = $( "form input[type = 'checkbox']:checked" ).toArray()
      //.map(x => `${x.value} <input autocomplete="off" type="checkbox" ${x.checked ? 'checked' : ''} readonly="true">`);
      .map((x, i) => `<div id="criteria_${i}" style="float: left;">${x.value}</div>`);
    let selectedNonCheckboxes = $( "form input[type != 'checkbox']" ).toArray()
      .filter(x => x.value != null)
      .map(x => `${x.id} <input autocomplete="off" value="${x.value}" style="width: ${x.value.toString().length + 2}ch" readonly="true">`);

    let changed = selectedNonCheckboxes.concat(selectedCheckboxes).join("");
    changed = selectedCheckboxes.join('<div style="float: left;">,&nbsp</div>');
    changed = $( "form input[type = 'checkbox']:checked" ).toArray().map(input => i18n(`message.column.${input.value}`))

    $('#initialClusteringSettings').html(`<div id="initialClusteringSettingsValue" style="float: left;"><div style="float: left;" >${i18n('control.criteria.message')}</div>${changed}</div>`);

  }

  function processSettingChange(event) {
    let inputControl = event.target;
    let key = event.target.id;
    let settings = currentSettings();

    if (hasSettingChanges(thisData.clusterInitialSettings, settings)) {
      if (!thisData.settingsChanged) {
        // show green button to calculate and blue hide
        $("#clusterSubmitButton").toggleClass('d-none');
        $('#deltaClusteringSettings').addClass('d-none');

      }

      if (!sameValue(key, thisData.clusterInitialSettings, settings)) {
      console.log(`New value for ${key}`)
        $(`label[for='${key}']`).addClass("bg-info")
      } else {
      console.log(`Original value for ${key}`)
        $(`label[for='${key}']`).removeClass("bg-info")
      }

      thisData.settingsChanged = true;
      console.log("change detected")
    } else {
      $(`label[for='${key}']`).removeClass("bg-info")
      if (thisData.settingsChanged) {
        //show blue hide button
        $("#clusterSubmitButton").toggleClass('d-none');
      } else {
        console.log("ignore");
      }
      thisData.settingsChanged = false;
    }

    showModifications();
  }

  function showModifications() {
    let settings = currentSettings();
    let modifiedKeys = Object.keys(settings).filter(key => thisData.clusterInitialSettings[key] != settings[key]);
    let otherModifiedKeys = Object.keys(thisData.clusterInitialSettings).filter(key => thisData.clusterInitialSettings[key] != settings[key]);
    let uniqueKeys = Array.from(new Set(modifiedKeys.concat(otherModifiedKeys)));

    uniqueKeys = uniqueKeys
    .filter(modifiedKey => document.getElementById(modifiedKey).type == "checkbox");
    console.log("*********", uniqueKeys);

    let html = uniqueKeys
    .map(modifiedKey => {
      let input = document.getElementById(modifiedKey);
      if (input.type == "checkbox") {
        //return `${input.value} <input autocomplete="off" type="${input.type}" ${input.checked ? 'checked' : ''} readonly="true">`
        return `${i18n('message.column.' + input.value)} ${input.checked ? i18n('control.added') : i18n('control.removed')}`
      } else {
        //return `${modifiedKey} <input autocomplete="off" value = "${input.value}" style="width: ${input.value.toString().length + 2}ch" readonly="true">`;
        return `${modifiedKey} <input autocomplete="off" value = "${input.value}" style="width: ${input.value.toString().length + 2}ch" readonly="true">`;
      }
    }).join(", ");


    $('#deltaClusteringSettings').html(i18n('control.changes', {var1: html}));
    if (uniqueKeys.length > 0) {
      $('#deltaClusteringSettings').removeClass('d-none');
    } else {
      $('#deltaClusteringSettings').addClass('d-none');
    }
  }

  function currentSettings() {
    return $("form input").toArray()
      .filter(x => !["checkbox", "submit"].includes(x.type) || (x.type=="checkbox" && x.checked))
      .reduce((acum, input) => { acum[input.id] = input.type == "checkbox" ? input.checked : input.value ; return acum; }, {});
  }


  function hasSettingChanges(settings1, settings2) {
    let keys = Object.keys(settings1);
    if (keys.length != Object.keys(settings2).length) {
      return true;
    }

    return !keys.every(key => sameValue(key, settings1, settings2));
  }

  function sameValue(key, settings1, settings2) {
    //let settings1IncludeKey = settings1.hasOwnProperty(key);
    //let settings2IncludeKey = settings2.hasOwnProperty(key);

    //Included only in one
    //if (settings1IncludeKey ^ settings2IncludeKey) return false;

    //Both null
    //if (!settings1IncludeKey) return true;


    //let value1 = settings1[key];
    //let value2 = settings2[key];
    return settings1[key] == settings2[key];

    //let isCheckbox = document.getElementById(key).type == 'checkbox';
    //if (isCheckbox) {
    //  return input1 == input2;
    //} else {
    //  return input1 == input2.value;
    //}
  }

  return ClusterControl;
});
