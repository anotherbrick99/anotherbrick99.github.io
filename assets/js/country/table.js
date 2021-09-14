define('country/table', ["table", "tableColReorder", "tableButton", "tableColVis"], function(MyChart) {

  var table = null;
  var chartManager = null;
  function MyTable(containerId, tableDatasources, buttonGroups, pageLength, manager) {
    if (arguments.length == 0) return;//HACK for map tablemanager
    var pageLengths = [5, 10, 15, 20];
    chartManager = manager;

    console.log("Rendering table")
    table = jQuery(`#${containerId}`).DataTable({
      dom: 'Bfrtip',
      fnDrawCallback: function(settings) {
        var isFirstDraw = table == null;
        if (isFirstDraw) return;//Init

        setTimeout(() => chartManager.receiveDatasetsToShow(tableCurrentPageLocalizableNames(), table.button("smoothed:name").active()), 0);
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

    table.tableRefresh = MyTable.prototype.tableRefresh

    var tableIndexes = [...Array(table.columns().indexes().length).keys()];
    var format = new Intl.NumberFormat(chartData["locale"], { minimumFractionDigits:2, maximumFractionDigits: 2 })
    var tableColumnNames = tableIndexes.map(i => table.column(i).header().dataset.name);

    var rows = tableDatasources.map(datasource => datasource.slice(-1)[0] || {})
    rows = tableDatasources.map(datasource => {
      let result = Object.assign({}, datasource.slice(-1)[0] || {});
      tableColumnNames.forEach(column => {
        if (result[column] == null || result[column] == "") {
          for (let i = datasource.length -1 ; i >= 0 ; i--) {
            let previousValue = datasource[i][column];
            let previousDate = datasource[i]["date"];
            if (previousValue != null && previousValue != "") {
              result[column] = {date: previousDate, value: previousValue};
              break;
            }
          }
        };
      });

      return result;
    })


    rows.forEach((row, i) => {
      //if (Object.keys(row).length == 0)
      //  row["name"] = `>${chartData.sourceNames[i]}<`;
      //row["flag"] = "><"
      row["last_update_date"] = row["date"]
    })


    this.addNewTableRows(rows.filter(r => Object.keys(r).length > 1))

    //remove empty columns
    var emptyColumns = table.columns().data().toArray()
      .map((data, i) => [i, data])
      .filter(indexAndData => indexAndData[1].every(value => value == ""))
      .map(indexAndData => table.column(indexAndData[0]));

    console.log("Rendered table");
  }


  MyTable.prototype.rowLocalizableName = function(row) {
    return row[1].match(">(.+)<")[1];
  }
  let rowLocalizableName = MyTable.prototype.rowLocalizableName;

  MyTable.prototype.tableCurrentPageLocalizableNames = function() {
    return table.rows( { page:'current', order: 'applied', search: 'applied' } )
                .data()
                .map(rowLocalizableName);
  }
  let tableCurrentPageLocalizableNames = MyTable.prototype.tableCurrentPageLocalizableNames;

  MyTable.prototype.addNewTableRow = function(rowObject) {
    this.addNewTableRows([rowObject]);
  }

  MyTable.prototype.removeRow = function(name) {
    console.log("Removing row")
    var index = [...Array(table.rows().data().length).keys()].findIndex(i => rowLocalizableName(table.row(i).data()) == name);
    table.row(index).remove().draw();
    console.log("Removed row")
  }

  MyTable.prototype.addNewTableRows = function(rowObjects) {
      if (table == null) {
          console.log("Initialization. Skip...")
          return;
      }

     var tableIndexes = [...Array(table.columns().indexes().length).keys()];
     var format = new Intl.NumberFormat(chartData["locale"], { minimumFractionDigits:2, maximumFractionDigits: 2 })
     var tableColumnNames = tableIndexes.map(i => table.column(i).header().dataset.name);
     rowObjects.forEach(rowObject => {
      var row = tableColumnNames.map(name => {
        let x = rowObject[name] || null;
        if (name == "continent") {
          if (x != null) {
            return `<a href="${rowObject.continent_url}">${rowObject.continent}</a>`
          }
          return x;
        } else if (name == "name") {
          return `<a href="${rowObject.name_url}">${rowObject.name}</a>`;
        } else if (name == "flag") {
          return rowObject.flag;
        }
        //format value
        if (typeof(x) == "number") {
          return format.format(x);
        } else if (typeof(x) =="string") {
          return x;
        } else if (x != null && typeof(x) == "object") {
          let keys = Object.keys(x);
          if (keys.length != 2 || !["value", "date"].every(key => keys.includes(key))) {
            throw `Invalid object ${x} for table cell ${name}`
          }
          let value = typeof(x.value) == "number" ? format.format(x.value) : x.value;
          return `<span style="color: red;" title="Data not updated since ${x.date}" >${value}</span>`;
        } else {
          console.log(`Table cell ${name} with value(${typeof(x)}${x})`)
          return x;
        }
      });
      table.row.add(row);
     })

      table.draw();
    }

  MyTable.prototype.tableRefresh = function() {
    const smoothed = table.button(".smoothed_button").active();
    const activeAlternativeButtons = table.buttons(".alternative.active");
    if (activeAlternativeButtons.length != 1) throw new Error("Unexpected active buttons");

    const activeClass = activeAlternativeButtons[0].node.className.match("view_([^ ]+)")[1];
    let allAlternatives = table.buttons(".alternative").map(x => x.node.className.match("view_([^ ]+)")[1]).toArray();
    const nonActiveClasses = allAlternatives.filter(c => c != activeClass);

    //Show regular and smoothedmode columns
    const smoothedMode = smoothed ? 'smoothed' : 'raw';
    const showSelector = `.${activeClass}.regular,.${activeClass}.${smoothedMode}`;
    table.columns(showSelector).visible(true);
    //Hide nonsmoothedmode columns
    const invertedModeHidden = smoothedMode == 'smoothed' ? 'raw' : 'smoothed';
    table.columns(`.${activeClass}.${invertedModeHidden}`).visible(false);

    //Hide non active classes
    const hideSelector = nonActiveClasses.map(c => `.${c}`).join(",");
    table.columns(hideSelector).visible(false);

    setTimeout(() => chartManager.receiveDatasetsToShow(tableCurrentPageLocalizableNames(), smoothed), 0);
  }

  return MyTable;
})