//BEGIN LICENSE BLOCK 
//Interneuron Terminus

//Copyright(C) 2025  Interneuron Limited

//This program is free software: you can redistribute it and/or modify
//it under the terms of the GNU General Public License as published by
//the Free Software Foundation, either version 3 of the License, or
//(at your option) any later version.

//This program is distributed in the hope that it will be useful,
//but WITHOUT ANY WARRANTY; without even the implied warranty of
//MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

//See the
//GNU General Public License for more details.

//You should have received a copy of the GNU General Public License
//along with this program.If not, see<http://www.gnu.org/licenses/>.
//END LICENSE BLOCK 
/* Interneuron Observation App
Copyright(C) 2023  Interneuron Holdings Ltd
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
See the
GNU General Public License for more details.
You should have received a copy of the GNU General Public License
along with this program.If not, see<http://www.gnu.org/licenses/>. */
import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, ViewEncapsulation, HostListener, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ObservationGraph } from './observation-graph';
import * as d3 from "d3";
import { ApirequestService } from '../services/apirequest.service';
import { filters, filterParams, filterparam, selectstatement, orderbystatement, filter } from '../models/Filter.model';
import { SubjectsService } from '../services/subjects.service';
import { AppService } from '../services/app.service';
import { forkJoin, Subscription } from 'rxjs';
import moment from 'moment';
import * as html2pdf from 'html2pdf.js'
import html2canvas from 'html2canvas';
// import jsPDF from 'jspdf';
// import domtoimage from 'dom-to-image';
// import * as htmlToImage from 'html-to-image';
// import { toPng, toJpeg, toBlob, toPixelData, toSvg } from 'html-to-image';
// const pdfMake = require('pdfmake/build/pdfmake.js');
// import * as pdfFonts from "pdfmake/build/vfs_fonts";  
// declare var require: any;
// const htmlToPdfmake = require("html-to-pdfmake");
// (<any>pdfMake).vfs = pdfFonts.pdfMake.vfs;
// declare global {
//   interface Window { html2canvas: any; }
// }
// import * as domToPdf from 'dom-to-pdf';

// window.html2canvas = html2canvas;
@Component({
  selector: 'app-observation-chart',
  templateUrl: './observation-chart.component.html',
  styleUrls: ['./observation-chart.component.css'],
  encapsulation: ViewEncapsulation.None,
  //changeDetection: ChangeDetectionStrategy.OnPush

})
export class ObservationChartComponent implements AfterViewInit, OnDestroy {
  headerwidth = "1224px";
  refWeightValue: any;
  refHeightValue: any;
  loadcomplete = false;
  loadgraphcomplete = false;
  tempData: any[] = [];
  runningTotals: any[] = [];
  ngAfterViewInit(): void {
    const element = this.chartHolder.nativeElement;
    //this.tooltip = d3.select(element).append("div").style("opacity", "0").style("position", "absolute");

    //this.appService.logToConsole(this.parseServerDate);
  }

  @ViewChild('yAxisHolder')
  private yAxisHolder: ElementRef;

  @ViewChild('xAxisHeader')
  private xAxisHeader: ElementRef;


  @ViewChild('gh')
  private graphHolder: ElementRef;


  @ViewChild('chartHolder')
  private chartHolder: ElementRef;

  @ViewChild('observationChartWrapper')
  private observationChartWrapper: ElementRef;

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    this.appService.logToConsole("resized");
    this.cleanUpTooltips();
    if (this.isActualReize())
      this.drawChart();
  }
  arrayOfpages: { pageNumber: number; scale: string; data: any[]; }[];
  @HostListener("window:scroll", [])
  onWindowScroll() {
    //var dateTimeAxisHeaderSVG = document.getElementById("xDateTimeAxis");
    var y = scrollY;

    //dateTimeAxisHeaderSVG.setAttribute("transform", "translate("+ 0+ "," + y + ")");

    //this.appService.logToConsole("Scroll Event", y);
  };

  @HostListener('window:orientationchange', ['$event'])
  onOrientationChange(event) {
    console.log('orientationChanged');
    setTimeout(() => {
      this.currentWindowInnerWidth = window.innerWidth;
      this.cleanUpTooltips();
      this.drawChart();
    }, 500);

  }

  chartGraphs: any; //"./assets/meta_chartgraphs.json";
  graphdata: any; //"./assets/data24.json";
  chartPage: number = 0;
  dataStartIndex: number;
  dataEndIndex: number;
  numberOfColumnsInTheChart = 18; // minimum 10
  numberOfPagesInChart: number;
  subscriptions: Subscription = new Subscription();

  bristolstoolhistorydata = [];
  foodandfluidhistorydata = [];
  bloodpressurehistorydata = [];
  bloodglucosehistorydata = [];
  gcshistorydata = [];
  comascalehistorydata = [];
  pupilhistorydata = [];
  limbshistorydata = [];
  news2historydata = [];
  heighthistorydata = [];
  weighthistorydata = [];
  ScaleType = ""
  waistcircumferencehistorydata = [];
  oldHeight: string = '';
  oldWeight: string = '';
  oldWaistCircumference: string = '';
  heightWeightData = [];
  currentDate = moment().format('DD/MM/YYYY hh:mm');
  isPrinting: boolean = false;
  printHeaderwidth = '800px';
  graphimage: string | null = null;

  chartGraphsCollection: { [key: string]: any } = {};

  @ViewChild('dischargeSummaryElement')
  dischargeSummaryElement: ElementRef;

  tickLabelDateTimeFormat(d: Date) {
    if (!d) return "";
    else return ("0" + d.getHours()).slice(-2)
      + ":"
      + ("0" + d.getMinutes()).slice(-2)
      + " "
      + ("0" + d.getDate()).slice(-2)
      + "/"
      + ("0"
        + (d.getMonth() + 1)).slice(-2)
      + "/"
      + (" " + (d.getFullYear())).slice(-2)
  };


  lineGenerator = d3.line().x(function (d, i) { return d.x; }).y(function (d, i) { return d.y; }).curve(d3.curveLinear); //draws the lines between the dots

  isValueAmendable: boolean = false;

  currentWindowInnerWidth = window.innerWidth;

  constructor(private apiRequest: ApirequestService, private subjects: SubjectsService, public appService: AppService, private cdr: ChangeDetectorRef) {
    this.subscriptions.add(this.subjects.drawGraph.subscribe((refreshData = true) => {


      this.loadAllChartGraphs(
        (fileName, data) => {
         // console.log(`Loaded file: ${fileName}`, data);
        },
        () => {

          this.graphdata = null;
          this.isValueAmendable = this.appService.isCurrentEncouner;
          //this.drawChart();
          this.getData();
          // this.getHistoryDataOfBadges();
          // this.getHeightWeightWaistCircumference();


        }
      );




    }));
    // this.subscriptions.add(this.subjects.drawGraph.subscribe(() => {
    //   this.graphdata = null;

    //   this.isValueAmendable = this.appService.isCurrentEncouner;
    //   //this.drawChart();

    //   this.getData();
    //   this.getHistoryDataOfBadges();
    //   this.getHeightWeightWaistCircumference();

    // }));


  }
  ngOnDestroy() {
    this.appService.logToConsole("destroying Observations chart");
    this.subscriptions.unsubscribe();
  }

  getData() {
    this.appService.logToConsole("getting data");
    //get graph json this.appService.baseURI + "/GetBaseViewList/meta_chartgraphs
    let EWSScale = this.appService.currentEWSScale;
    this.chartGraphs = null
    let ewsJsonFileName = "";
    switch (EWSScale) {
      case "MEWS-Scale":
        ewsJsonFileName = "MEWS" + "_chartgraphs.json";
        break;
      case "MARSI":
        ewsJsonFileName = "MARSI" + "_chartgraphs.json";
        break;
      case "NEWS2-Scale1":
        ewsJsonFileName = "NEWS2" + "_chartgraphs.json";
        break;
      case "NEWS2-Scale2":
        ewsJsonFileName = "NEWS2" + "_chartgraphs.json";
        break;
      case "PEWS-0To11Mo":
        ewsJsonFileName = "PEWS-0To11Mo" + "_chartgraphs.json";
        break;
      case "PEWS-1To4Yrs":
        ewsJsonFileName = "PEWS-1To4Yrs" + "_chartgraphs.json";
        break;
      case "PEWS-5To12Yrs":
        ewsJsonFileName = "PEWS-5To12Yrs" + "_chartgraphs.json";
        break;
      case "PEWS-13To18Yrs":
        ewsJsonFileName = "PEWS-13To18Yrs" + "_chartgraphs.json";
        break;
      default:
      // code block   
    }

    this.subscriptions.add(this.apiRequest.getRequest("./assets/" + ewsJsonFileName).subscribe(
      (response) => {
        this.chartGraphs = response;
        // get data json
        let url = "";
        if (this.appService.appConfig.environment == 'mental_healthcare') {
          url = this.appService.baseURI + "/GetBaseViewListByPost/carerecord_observationsmhc"
        } else {
          url = this.appService.baseURI + "/GetBaseViewListByPost/carerecord_observations"
        }
        this.subscriptions.add(this.apiRequest.postRequest(url, this.createObservationsFilter()).subscribe(
          (response) => {
            for (var i of response) {
              if (this.appService.appConfig.environment == 'mental_healthcare' && i.patientrefused) {
                i.earlywarningscore = '{"observationvalue" : "R", "units" : null, "hasbeenammended" : false, "guidance" : "LOW/MEDIUM CLINICAL RISK - URGENT WARD-BASED RESPONSE!"}'
              }
              // if(i.incomplete && i.earlywarningscore){
              //   let jsonobj = JSON.parse(i.earlywarningscore)
              //   jsonobj.observationvalue = jsonobj.observationvalue + "(p)"
              //   i.earlywarningscore = JSON.stringify(jsonobj)
              // }
            }
            let responseArray = JSON.stringify(response);
            let cleanJson = responseArray.replace(/"{/g, '{').replace(/}\"/g, '}').replace(/\\"/g, '"').replace(/\\"/g, '"');
            // console.warn(responseArray.replace(/"{/g, '{').replace(/}\"/g, '}').replace(/\\"/g, '"'));
            //this.appService.logToConsole(JSON.parse(cleanJson));
            this.graphdata = JSON.parse(cleanJson);

            //for (var i in this.graphdata) {
            //  if (this.graphdata[i].isonoxygen == null) {
            //    this.graphdata[i].isonoxygen = { observationvalue: false, hasbeenammended: false, units: "" };
            //  }
            //}
            this.appService.logToConsole("got data");
            this.arrayOfpages = this.createPagedGraphData(this.graphdata, this.numberOfColumnsInTheChart)

            this.drawChart();
          }));
      }));
  }

  changeConfig(EWSScale: string) {
    this.appService.logToConsole("getting data");
    this.chartGraphs = null;

    const fileMap: { [key: string]: string } = {
      "MARSI": "MARSI_chartgraphs.json",
      "MEWS-Scale": "MEWS_chartgraphs.json",
      "NEWS2-Scale1": "NEWS2_chartgraphs.json",
      "NEWS2-Scale2": "NEWS2_chartgraphs.json",
      "PEWS-0To11Mo": "PEWS-0To11Mo_chartgraphs.json",
      "PEWS-1To4Yrs": "PEWS-1To4Yrs_chartgraphs.json",
      "PEWS-5To12Yrs": "PEWS-5To12Yrs_chartgraphs.json",
      "PEWS-13To18Yrs": "PEWS-13To18Yrs_chartgraphs.json",
    };

    const fileName = fileMap[EWSScale];
    if (!fileName || !this.chartGraphsCollection[fileName]) {
      this.appService.logToConsole("Config not found");
      return;
    }

    this.chartGraphs = this.chartGraphsCollection[fileName];
  }
  loadAllChartGraphs(callback?: (fileName: string, data: any) => void, completeCallback?: () => void) {
    const fileMap: { [key: string]: string } = {
      "MEWS-Scale": "MEWS_chartgraphs.json",
      "MARSI": "MARSI_chartgraphs.json",
      "NEWS2-Scale1": "NEWS2_chartgraphs.json",
      "NEWS2-Scale2": "NEWS2_chartgraphs.json",
      "PEWS-0To11Mo": "PEWS-0To11Mo_chartgraphs.json",
      "PEWS-1To4Yrs": "PEWS-1To4Yrs_chartgraphs.json",
      "PEWS-5To12Yrs": "PEWS-5To12Yrs_chartgraphs.json",
      "PEWS-13To18Yrs": "PEWS-13To18Yrs_chartgraphs.json",
    };

    const uniqueFiles = Array.from(new Set(Object.values(fileMap)));
    let loadedCount = 0;

    uniqueFiles.forEach((fileName) => {
      this.subscriptions.add(
        this.apiRequest.getRequest(`./assets/${fileName}?v=${Math.random()}`).subscribe({
          next: (response) => {
            this.chartGraphsCollection[fileName] = response;
            if (callback) {
              callback(fileName, response);
            }
          },
          error: (err) => {
            this.appService.logToConsole(`Error loading ${fileName}: ${err}`);
          },
          complete: () => {
            loadedCount++;
            if (loadedCount === uniqueFiles.length && completeCallback) {
              completeCallback();
            }
          }
        })
      );
    });
  }

  createPagedGraphData(graphData: any[], maxPageSize: number = 18) {
    const pages: { pageNumber: number; scale: string; data: any[] }[] = [];
    let pageNumber = 1;
    let currentPageData: any[] = [];

    const normalizeScale = (scale: string) =>
      scale === "NEWS2-Scale2" ? "NEWS2-Scale1" : scale;

    let currentScale = normalizeScale(graphData[0]?.scale);

    // set correct page size based on scale
    let currentPageSize = currentScale === "MARSI" ? 9 : maxPageSize;

    for (const item of graphData) {
      const itemScale = normalizeScale(item.scale);
      const itemPageSize = itemScale === "MARSI" ? 9 : maxPageSize;

      if (itemScale === currentScale && currentPageData.length < itemPageSize) {
        currentPageData.push(item);
      } else {
        if (currentPageData.length > 0) {
          pages.push({
            pageNumber: pageNumber++,
            scale: currentScale,
            data: currentPageData,
          });
        }
        currentScale = itemScale;
        currentPageSize = itemPageSize;
        currentPageData = [item];
      }
    }

    if (currentPageData.length > 0) {
      pages.push({
        pageNumber: pageNumber,
        scale: currentScale,
        data: currentPageData,
      });
    }

    return pages;
  }

  createObservationsFilter() {

    let condition = "person_id=@person_id and encounter_id=@encounter_id";
    let f = new filters()
    f.filters.push(new filter(condition));

    let pm = new filterParams();
    pm.filterparams.push(new filterparam("person_id", this.appService.personId));
    pm.filterparams.push(new filterparam("encounter_id", this.appService.encounter_id));

    let select = new selectstatement("SELECT *");

    let orderby = new orderbystatement("ORDER BY datefinished desc");

    let body = [];
    body.push(f);
    body.push(pm);
    body.push(select);
    body.push(orderby);
    return JSON.stringify(body);
  }

  ngOnInit() {
  this.currentWindowInnerWidth = window.innerWidth;
  }



  //------------------------------------------------------------------------------------------------------------------------------
  //Draw the Chart
  //------------------------------------------------------------------------------------------------------------------------------
  drawChart() {
    this.appService.logToConsole("inside draw chart");
    if (!this.graphdata) {
      this.appService.logToConsole("looks like no data yet");
      //await this.getData();
    }
    else {

      // this.subjects.latestObservationEvent.next(this.graphdata[0]);
      // this.appService.logToConsole("this.chartGraphs");
      // this.appService.logToConsole(this.chartGraphs);
      // this.appService.logToConsole(this.graphdata)
      // this.appService.logToConsole("Startign to draw");
      if (!d3.select(this.chartHolder.nativeElement).select("svg").empty()) {
        d3.select(this.chartHolder.nativeElement).select("svg").remove();
        d3.select(this.xAxisHeader.nativeElement).select("svg").remove();
      };

      //chart dimension
      // keep here for so the window will resize

      const maxWidth = 1224;
      //var windowWidth = document.getElementById("observationChartWrapper").offsetWidth > maxWidth ? maxWidth : document.getElementById("observationChartWrapper").offsetWidth;
      var windowWidth = this.observationChartWrapper.nativeElement.offsetWidth > maxWidth ? maxWidth : this.observationChartWrapper.nativeElement.offsetWidth;

      //this.chartHolder.nativeElement.offsetWidth; //1000; // (window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth);

      //this.appService.logToConsole("windowWidth" + windowWidth);
      let ratioOfCellHeightToWidth = 0.8;
      // chartHeight = (window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight);

      let yAxisWidth = windowWidth * 0.28;
      let graphWidth = windowWidth * 0.65;
      this.numberOfColumnsInTheChart = 18

      if (this.arrayOfpages.length > 0 && this.arrayOfpages[this.chartPage].scale.includes("MARSI")) {
        ratioOfCellHeightToWidth = 0.4;
        yAxisWidth = windowWidth * 0.21;
        graphWidth = windowWidth * 0.60;
        this.numberOfColumnsInTheChart = 9
      }
      else if (this.arrayOfpages.length == 0 && this.appService.currentEWSScale.includes("MARSI")) {
        ratioOfCellHeightToWidth = 0.4;
        yAxisWidth = windowWidth * 0.21;
        graphWidth = windowWidth * 0.60;
        this.numberOfColumnsInTheChart = 9
      }


      const columnWidth = graphWidth / this.numberOfColumnsInTheChart;
      const graphXPosition = yAxisWidth; // distance of chart form y axis

      const parameterRowHeight = columnWidth * ratioOfCellHeightToWidth;

      const xDateTimeHolderHeight = parameterRowHeight * 5.0;

      if (this.chartPage >= this.arrayOfpages.length) {
        this.chartPage = 0
      }

      var observationData = []
      this.numberOfPagesInChart = 0
      if (this.arrayOfpages.length > 0) {
        this.numberOfPagesInChart = this.arrayOfpages.length - 1
        var observationData = this.arrayOfpages[this.chartPage].data


        this.changeConfig(this.arrayOfpages[this.chartPage].scale)
        this.appService.selectedChart = this.arrayOfpages[this.chartPage].scale
      }
      let numberOfGraphs = this.chartGraphs.length;
      let numberOfGraphRows = 0;




      this.chartGraphs.forEach(graph => {
        numberOfGraphRows += graph.parameterlabelsdomain.length;
      });
    //  this.appService.logToConsole("number of rows = " + numberOfGraphRows);
      //var chartHeight = (numberOfGraphRows * parameterRowHeight) + (numberOfGraphs * parameterRowHeight / 4) + parameterRowHeight+80; // rows + gaps between charts + lower border
      const extraHeight = windowWidth * 0.0351 // More padding for small screens
      var chartHeight = (numberOfGraphRows * parameterRowHeight) + (numberOfGraphs * parameterRowHeight / 4) + parameterRowHeight + extraHeight + (this.appService.selectedChart == "MEWS-Scale" ? 30 : 0);
      // chart data index
      // this.dataStartIndex = (this.chartPage * this.numberOfColumnsInTheChart);

      //Add the chart svg group
      var headerSvg = d3.select(this.xAxisHeader.nativeElement).append("svg")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", windowWidth)
        .attr("height", xDateTimeHolderHeight);

      var chartSvg = d3.select(this.chartHolder.nativeElement).append("svg")
        .attr("width", windowWidth)
        .attr("height", chartHeight);


      //------------------------------------------------------------------------------------------------------------------------------
      //headerSVG Date Time xAxis
      //------------------------------------------------------------------------------------------------------------------------------

      //Domain and Range
      const datesDomain = [];
      const dateGUIDDomain = [];
      const stringDateArray = [];

      for (let i = 0; i < this.numberOfColumnsInTheChart; i++) {

        var arrayItem = observationData[i];

        if (arrayItem != undefined && arrayItem.datefinished != null) {
          datesDomain.unshift(new Date(moment(arrayItem.datefinished.toString(), moment.ISO_8601).toString())); // push to the start of the array       
          stringDateArray.unshift(arrayItem.datefinished); // push to the start of the array
          dateGUIDDomain.unshift(arrayItem.observationevent_id); // push to the start of the array
        }
      };

      //Column parameters

      const endOfRange = graphXPosition + graphWidth - columnWidth / 2;
      const datesRange = [(endOfRange - ((datesDomain.length - 1) * columnWidth)), endOfRange];

      //xScales

      const xDateGUIDScale = d3.scalePoint().domain(dateGUIDDomain).range(datesRange);

      //xAxis
      const xDateTimeAxis = d3.axisBottom(xDateGUIDScale)
        .ticks(this.numberOfColumnsInTheChart)
        .tickFormat((d) => {
          var index = dateGUIDDomain.indexOf(d);
          var dateObject = datesDomain[index];
          return this.tickLabelDateTimeFormat(dateObject);
        })
        //.attr("class", "red")
        .tickSizeOuter(6);

      // var ff = d3.select('xDateTimeAxis');
      // this.appService.logToConsole(ff);

      // Axis is drawing at the end - so it will appear above the chart

      var headerSvgGroup = headerSvg.append("g")
        .attr("id", "xDateTimeAxis")
        .attr("class", "xDateTimeAxis");

      headerSvgGroup
        .append("rect")
        .attr("class", "dateTimeBackground")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", windowWidth)
        .attr("height", xDateTimeHolderHeight);

      //Generate xAxis of the chart
      headerSvgGroup.call(xDateTimeAxis);

      //Selected all text elements of the x-axis;
      //Split the time and date component and created two new text elements; deleted the original text element
      //time text element is identified by "xAxisTimeComponent" css class; date text element is identified by "xAxisDateComponent" css class;
      headerSvgGroup.selectAll(".tick text").each(function (d) {
        var elParent = d3.select(this.parentNode);
        var el = d3.select(this);
        var words = d3.select(this).text().split(' ');
        el.remove();

        var timeText = elParent.append('text');
        timeText.text(words[0]);
        timeText.attr("class", "xAxisTimeComponent")

        var dateText = elParent.append('text');
        dateText.text(words[1]);
        dateText.attr("class", "xAxisDateComponent");
      });

      //registered onclick event on each text element of the x-axis (both time and date text elements)
      headerSvgGroup.selectAll(".tick text")
        .on("click", (event, d) => {
          this.dateWasTapped(d);
        });

      //Start of x-axis text alignment w.r.t. the chart
      var timeTextHeight = 0;
      if (d3.select(".xAxisTimeComponent").node()) {
        timeTextHeight = d3.select(".xAxisTimeComponent").node().getBoundingClientRect().height;
      }
      var dateTextHeight = 0;
      if (d3.select(".xAxisDateComponent").node()) {
        dateTextHeight = d3.select(".xAxisDateComponent").node().getBoundingClientRect().height;
      }

      headerSvgGroup.selectAll(".xAxisTimeComponent").attr("transform", "translate(10, " + (xDateTimeHolderHeight - (timeTextHeight)) + ") rotate(" + -45 + ",0," + timeTextHeight + ")");
      headerSvgGroup.selectAll(".xAxisDateComponent").attr("transform", "translate(" + 6 + ", " + (xDateTimeHolderHeight - ((timeTextHeight + dateTextHeight))) + ") rotate(" + -45 + ",0," + (timeTextHeight + dateTextHeight) * -1 + ")");

      // End of x-axis text alignment w.r.t. the chart

      headerSvgGroup.append("path")
        .attr("class", "dateTimeBackground")
        .attr("stroke", "black")
        .attr("d", this.lineGenerator([{ x: 0, y: xDateTimeHolderHeight }, { x: windowWidth, y: xDateTimeHolderHeight }]));

      // Add forward and back buttons
      var buttonWidth = yAxisWidth * 0.8;
      var buttonYPosition = xDateTimeHolderHeight * 0.6;
      var firstButtonXposition = buttonWidth * 0.0625;

      headerSvgGroup.append("svg")
        .attr("x", buttonWidth * 0.0625)
        .attr("y", buttonYPosition)
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", "0 0 " + buttonWidth + " " + buttonWidth + "")
        .append("path")
        .attr("class", "pagesButton")
        .attr("d", "M 28.5,0.41 C 28.5,0.41 0,16 0,16 L 28.5,31.59 C 28.5,31.59 28.5,28.85 28.5,25 L 51,25 51,7 28.5,7 C 28.5,3.15 28.5,0.41 28.5,0.41 L 28.5,0.41 Z M 28.5,0.41")
        .attr("opacity", () => {
          var opacity = 0;
          if (this.chartPage != this.numberOfPagesInChart) {
            opacity = 1;
          }
          return opacity;
        })
        .on("click", () => {
          this.movePageBack();
        });

      headerSvgGroup.append("svg")
        .attr("x", buttonYPosition + firstButtonXposition * 2)
        .attr("y", buttonYPosition)
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", "0 0 " + buttonWidth + " " + buttonWidth + "")
        .classed("svg-content", true)
        .append("path")
        .attr("class", "pagesButton")
        .attr("d", "M 22.5,0.41 C 22.5,0.41 51,16 51,16 L 22.5,31.59 C 22.5,31.59 22.5,28.85 22.5,25 L 0,25 0,7 22.5,7 C 22.5,3.15 22.5,0.41 22.5,0.41 L 22.5,0.41 Z M 22.5,0.41")
        .attr("opacity", () => {
          var opacity = 0;
          if (this.chartPage > 0) {
            opacity = 1;
          }
          return opacity;
        })
        .on("click", () => {
          this.movePageForward();
        });


      //------------------------------------------------------------------------------------------------------------------------------
      //GraphsYAxis
      //------------------------------------------------------------------------------------------------------------------------------
      // Parameter Domain and Range
      var observationParameterRange = [];

      var lastGraphWasOrdinal = false;

      for (let i = 0; i < this.chartGraphs.length; i++) { // iterate through the graphs

        var observationParameterGraph = this.chartGraphs[i];
      //  this.appService.logToConsole("graph_id = " + observationParameterGraph.graph_id);

        var parameterGraphHeight = parameterRowHeight * (observationParameterGraph.parameterlabelsdomain.length);

        var graphYPosition = i == 0 ? parameterRowHeight / 2 : observationParameterRange[0] + parameterRowHeight; // The first graph distance from the header


        if (observationParameterGraph.graphtype == "Ordinal" || observationParameterGraph.graphtype == "Heading") {
          if (lastGraphWasOrdinal && !observationParameterGraph.LineSpaceForOrdinal) {
            graphYPosition = observationParameterRange[0] + parameterRowHeight * 0.5;
          } else {
            lastGraphWasOrdinal = true;
          }
        } else {
          lastGraphWasOrdinal = false;
        };

        var adjustedBandingYPosition = graphYPosition - (parameterRowHeight / 2);

        observationParameterRange = []; // reset the graphParameterRange - which is used for the Y position of data points 

        for (let i = 0; i < observationParameterGraph.parameterlabelsdomain.length; i++) {
          observationParameterRange.push(adjustedBandingYPosition + parameterGraphHeight - (i * (parameterRowHeight)));
        };

        let parameterGraph = new ObservationGraph(this.apiRequest, xDateGUIDScale, chartSvg, observationParameterGraph, observationParameterRange, this.subjects, this.appService, this.isValueAmendable);
        let scale = this.appService.currentEWSScale;
        if (observationData.length > 0) {
          scale = observationData[0].scale
        }
        parameterGraph.drawGraph(graphXPosition, graphYPosition, graphWidth, this.numberOfColumnsInTheChart, yAxisWidth, scale);


        if (scale.includes("PEWS")) {
          parameterGraph.addPewsData(observationData, scale, graphWidth);
        }
        else if (scale.includes("MEWS")) {
          parameterGraph.addMEWSData(observationData, scale);
        }
        else if (scale.includes("MARSI")) {
          parameterGraph.addMARSIData(observationData, scale, graphWidth);
        }
        else {
          parameterGraph.addData(observationData, scale);

        }


      };

      //get data for other obs types 
      //draw other obs types 
      this.subscriptions.add(forkJoin([
        this.apiRequest.postRequest(`${this.appService.baseURI}/GetBaseViewListByPost/eobs_bcpobservations`, this.createFilter()),
        this.apiRequest.postRequest(`${this.appService.baseURI}/GetBaseViewListByPost/terminus_getpersonmeasurementsdetails`, this.createWeightHeightWaistCircumferenceFilter()),
      ]).subscribe(([observations, measurementsdetails]) => {
        this.getHistoryDataOfBadges(observations);
        this.getHeightWeightWaistCircumference(measurementsdetails);
        this.SetLoadCompleteAndDetachCDR();
      }, (error) => {
        this.SetLoadCompleteAndDetachCDR();
      }));

    }
  } //closes drawChar()

  SetLoadCompleteAndDetachCDR() {
    this.loadcomplete = true;

    //this.appService.reset();
    //this.cdr.detectChanges();
    //this.cdr.detach();

  }

  movePageBack() {
    //this.appService.logToConsole("movePageBack this.chartPage " + this.chartPage);
    //this.appService.logToConsole("this.numberOfPagesInChart " + this.numberOfPagesInChart);

    if (this.chartPage < this.numberOfPagesInChart) {
      this.chartPage++;
      this.drawChart();
    }

  };

  movePageForward() {
    // this.appService.logToConsole("movePageForward this.chartPage " + this.chartPage);
    if (this.chartPage > 0) {
      this.chartPage--;
      this.drawChart();
    }
  }

  dateWasTapped(d) {
    if (d) {
      this.subjects.openDeletePopover.next(d);
    }
  }

  cleanUpTooltips() {
    var activeToolTip = d3.selectAll('.tooltip').remove();
  };

  isDue() {

    if (this.appService.nextObsDueTime)
      if (moment(new Date(this.appService.nextObsDueTime).toISOString()).isBefore()) {
        return true;
      }
      else {
        return false;
      }
  }

  isBGDue() {

    if (this.appService.nextBGObsDueTime)
      if (moment(new Date(this.appService.nextBGObsDueTime).toISOString()).isBefore()) {
        return true;
      }
      else {
        return false;
      }
  }

  isBSCDue() {

    if (this.appService.nextBSCObsDueTime)
      if (moment(new Date(this.appService.nextBSCObsDueTime).toISOString()).isBefore()) {
        return true;
      }
      else {
        return false;
      }
  }

  isFFDue() {

    if (this.appService.nextFFObsDueTime)
      if (moment(new Date(this.appService.nextFFObsDueTime).toISOString()).isBefore()) {
        return true;
      }
      else {
        return false;
      }
  }

  isGCSDue() {

    if (this.appService.nextGCSObsDueTime)
      if (moment(new Date(this.appService.nextGCSObsDueTime).toISOString()).isBefore()) {
        return true;
      }
      else {
        return false;
      }
  }

  getHistoryDataOfBadges(observations) {
    if (this.appService.isNewsScale(this.appService.currentEWSScale)) {
      this.ScaleType = "NEWS2"
    }
    else if (this.appService.currentEWSScale == "MARSI") {
      this.ScaleType = "Marsi MEWS"
    }
    else if (this.appService.currentEWSScale == "PEWS-5To12Yrs") {
      this.ScaleType = "PEWS 5 to 12 Years"
    }
    else if (this.appService.currentEWSScale == "PEWS-13To18Yrs") {
      this.ScaleType = "PEWS 13 to 17 Years"
    }
    else if (this.appService.currentEWSScale == "MEWS-Scale") {
      this.ScaleType = "MEWS"
    }
    // this.subscriptions.add(forkJoin([
    //   this.apiRequest.postRequest(`${this.appService.baseURI}/GetBaseViewListByPost/eobs_bcpobservations`, this.createFilter()),
    //   this.apiRequest.postRequest(`${this.appService.baseURI}/GetBaseViewListByPost/terminus_getpersonmeasurementsdetails`, this.createWeightHeightWaistCircumferenceFilter()),
    // ]).subscribe(([observations, measurementsdetails]) => {

    // }));


    // this.subscriptions.add(this.apiRequest.postRequest(`${this.appService.baseURI}/GetBaseViewListByPost/eobs_bcpobservations`, this.createFilter())
    //   .subscribe(
    //     (observations) => {

    // console.log('observations',observations);
    if (observations && observations.length > 0) {
      const today = moment().startOf('day'); // Current date
      const twoDaysAgo = moment().subtract(2, 'days').startOf('day'); // Two days ago
      let bristolstooldetails = observations.filter(x => x.observationtype == 'bristolstool');
      let foodandfluiddetails = observations.filter(x => x.observationtype == 'foodandfluid' && moment(x.datestarted).startOf('day').isBetween(twoDaysAgo, today, 'days', '[]'));
      let bloodpressuredetails = observations.filter(x => x.observationtype == 'bloodpressure');
      let bloodglucosedetails = observations.filter(x => x.observationtype == 'bloodglucose');
      let gcsdetails = observations.filter(x => x.observationtype == 'gcs')
      let news2details = observations.filter(x => x.observationtype == 'news2' || x.observationtype == 'news2frequency')
      if (bristolstooldetails && bristolstooldetails.length > 0) {
        // console.log('bistolstooldetails',bristolstooldetails);
        this.bristolstoolhistorydata = bristolstooldetails;
      }

      if (foodandfluiddetails && foodandfluiddetails.length > 0) {
        this.foodandfluidhistorydata = foodandfluiddetails?.map((item) => {

          return {
            ...item,
            foodtakenhtml: JSON.parse(item.foodtaken)?.map((x: any) => (x.foodItemValue + ' - ' + x.foodItemConsumedValue)),
            fluidtakenhtml: JSON.parse(item.fluidtaken)?.map((x: any) => (x.fluidItemConsumedValue + ' ml - ' + x.fluidItemValue)),
            recordingreminder: item.frequencyoptionselected === 'Time' ? item.frequencyentered + ' ' + item.frequencyunitentered : 'Monitoring Stopped',
            fluidItemConsumedValue: '',
          };
        });

        this.tempData = this.foodandfluidhistorydata?.map(item => {
          return {
            ...item
          }
        });

        this.getRunningTotalBasedOnDateStarted(this.tempData[this.tempData.length - 1]?.datestarted);

        // console.log('foodandfluidhistorydata',this.foodandfluidhistorydata)
      }

      if (bloodglucosedetails && bloodglucosedetails.length > 0) {
        // console.log('bloodglucosedetails',bloodglucosedetails);
        this.bloodglucosehistorydata = bloodglucosedetails;
      }

      if (bloodpressuredetails && bloodpressuredetails.length > 0) {
        // console.log('bloodpressuredetails',bloodpressuredetails);
        this.bloodpressurehistorydata = bloodpressuredetails;
      }

      if (news2details && news2details.length > 0) {
        // console.log('news2details',news2details);
        this.news2historydata = news2details;
      }

      if (gcsdetails && gcsdetails.length > 0) {
        // console.log('gcsdetails',gcsdetails);
        gcsdetails.forEach(element => {
          let comascaledata;
          let pupildata;
          if (element.fluidtaken) {
            comascaledata = element.fluidtaken.split('|');
          }
          if (element.passedurine) {
            pupildata = element.passedurine.split('|');
          }

          // console.log('comascaledata',comascaledata);
          // console.log('pupildata',pupildata);

          this.comascalehistorydata.push({
            'datestarted': element.datestarted,
            'totalscore': element.foodtaken,
            'monitoringfrequency': element.monitoringfrequency,
            'partial': 'Yes',
            'eye': comascaledata[1],
            'verbal': comascaledata[2],
            'motor': comascaledata[3],
            'reason': element.frequencyreason,
            'recordedby': element.lastmodifiedby
          })

          this.pupilhistorydata.push({
            'datestarted': element.datestarted,
            'rightsize': pupildata[0] ? pupildata[0] : (pupildata[8] == 'true' ? 'N/A' : ''),
            'rightreaction': pupildata[1] ? pupildata[1] : (pupildata[8] == 'true' ? 'N/A' : ''),
            'leftsize': pupildata[2] ? pupildata[2] : (pupildata[8] == 'true' ? 'N/A' : ''),
            'leftreaction': pupildata[3] ? pupildata[3] : (pupildata[8] == 'true' ? 'N/A' : ''),
            'reason': element.frequencyreason,
            'recordedby': element.lastmodifiedby
          })

          this.limbshistorydata.push({
            'datestarted': element.datestarted,
            'leftarm': pupildata[4] ? pupildata[4] : (pupildata[8] == 'true' ? 'N/A' : ''),
            'rightarm': pupildata[5] ? pupildata[5] : (pupildata[8] == 'true' ? 'N/A' : ''),
            'leftleg': pupildata[6] ? pupildata[6] : (pupildata[8] == 'true' ? 'N/A' : ''),
            'rightleg': pupildata[7] ? pupildata[7] : (pupildata[8] == 'true' ? 'N/A' : ''),
            'reason': element.frequencyreason,
            'recordedby': element.lastmodifiedby
          })
        });



        // console.log('comascalehistorydata',this.comascalehistorydata);
        // console.log('pupilhistorydata',this.pupilhistorydata);
        // console.log('limbshistorydata',this.limbshistorydata);
      }
    }

    // },(error)=>{
    //   this.SetLoadCompleteAndDetachCDR();
    // }
    // )
    // )
  }

  getRunningTotalBasedOnDateStarted(startDate: Date) {
    this.runningTotals = [];
    const startMoment = moment(startDate).startOf('day').set({ hour: 7 });  // Start at 7 AM on startDate
    //const endMoment = moment(endDate).startOf('day').set({ hour: 7 }).add(1, 'day');  // End at 7 AM on endDate

    const isBeforeSevenAM = moment(startDate).isBefore(startMoment);

    const startDateTime = isBeforeSevenAM
      ? moment(startDate).subtract(1, 'days').set({ hour: 7, minute: 0, second: 0, millisecond: 0 })
      : startMoment;

    let currentMoment = startDateTime.clone();  // Track the current 7 AM window
    let currentRunningTotal = 0;  // Initialize running total for the current day
    const runningTotals = [];  // Array to store the results

    let sortedData = this.tempData.map(item => {
      return {
        ...item
      }
    });

    // First, sort the data by `datestarted`
    sortedData = sortedData.sort((a, b) => moment(a.datestarted).diff(moment(b.datestarted)));

    // Iterate through each observation (now sorted by datestarted)
    sortedData.forEach((obs, i) => {
      const obsMoment = moment(obs.datestarted);  // Convert datestarted to a Moment.js object

      // Reset running total if the observation moves to the next day (after 7 AM)
      while (obsMoment.isSameOrAfter(currentMoment.clone().add(1, 'day'))) {
        currentMoment.add(1, 'day');  // Move to the next day
        currentRunningTotal = 0;  // Reset the running total for the new day
      }

      // Check if the observation is within the current 7 AM to 7 AM window
      if (obsMoment.isBetween(currentMoment, currentMoment.clone().add(1, 'day'), null, '[)')) {
        const fluids = JSON.parse(obs.fluidtaken);  // Parse fluid intake data
        const totalFluids = fluids?.reduce((sum: any, fluid: any) => sum + (parseFloat(fluid.fluidItemConsumedValue) || 0), 0);

        if (obs._recordstatus !== 2) {  // Only add to running total if the entry is not deleted
          currentRunningTotal += totalFluids;
        }
        else {
          currentRunningTotal = currentRunningTotal;
        }

        runningTotals.push({
          currentRunningTotal
        });
      }
    });

    this.runningTotals = runningTotals.reverse();

  //  console.log('runningTotals', this.runningTotals);

    //return runningTotals.reverse();  // Return the results
  }

  getHeightWeightWaistCircumference(measurementsdetails) {

    // this.subscriptions.add(this.apiRequest.postRequest(`${this.appService.baseURI}/GetBaseViewListByPost/terminus_getpersonmeasurementsdetails`, this.createWeightHeightWaistCircumferenceFilter())
    //   .subscribe(
    //     (measurementsdetails) => {
    this.heightWeightData = JSON.parse(JSON.stringify(measurementsdetails));
    this.heightWeightData.sort((a, b) => new Date(a.observationtime).getTime() - new Date(b.observationtime).getTime());
    let prehight = null
    let preweight = null
    let prewaistt = null
    for (let obk of this.heightWeightData) {
      obk._weightadded = false
      obk._heightadded = false
      obk._waistadded = false
      if (!obk.isdeleted) {
        if (preweight && !obk.weight) {
          obk.weight = preweight
          obk._weightadded = true
        }
        preweight = obk.weight
        // ----------------------------------------------
        if (prehight && !obk.height) {
          obk.height = prehight
          obk._heightadded = true
        }
        prehight = obk.height
        // ----------------------------------------------
        if (prewaistt && !obk.waistcircumferance) {
          obk.waistcircumferance = prewaistt
          obk._waistadded = true
        }
        prewaistt = obk.waistcircumferance
      }

    }
    this.heightWeightData.sort((b, a) => new Date(a.observationtime).getTime() - new Date(b.observationtime).getTime());
    // },

    //   )
    // )

    // this.apiRequest.postRequest(`${this.appService.baseURI}/GetBaseViewListByPost/epma_getweightobservations`, this.createWeightHeightWaistCircumferenceFilter())
    //     .subscribe((response) => {

    //       if (response.length > 0) {
    //         this.weighthistorydata = response;
    //         // console.log('this.weighthistorydata',this.weighthistorydata);
    //       }
    //     }
    //     )

    // this.apiRequest.postRequest(`${this.appService.baseURI}/GetBaseViewListByPost/epma_getheightobservations`, this.createWeightHeightWaistCircumferenceFilter())
    //     .subscribe((response) => {

    //       if (response.length > 0) {
    //         this.heighthistorydata = response;
    //         // console.log('this.heighthistorydata',this.heighthistorydata);

    //       } 
    //   }
    // )

    // this.apiRequest.postRequest(`${this.appService.baseURI}/GetBaseViewListByPost/epma_getwaistcircumferenceobservations`, this.createWeightHeightWaistCircumferenceFilter())
    //   .subscribe((response) => {

    //     if (response.length > 0) {
    //       this.waistcircumferencehistorydata = response;
    //       // console.log('this.waistcircumferencehistorydata',this.waistcircumferencehistorydata);
    //     }
    //     this.generateHeightWeightData();
    //   }
    // )

  }



  createGraphImage() {
    this.isPrinting = true;
    let tempDiv: HTMLElement;
    const graphElement = document.getElementById('observationChartWrapper') as HTMLCanvasElement; // Your graph container
    // var t = graphElement.getContext('2d');
    requestAnimationFrame(() =>
      html2canvas(graphElement, {
        scale: 1,
        // ignoreElements: (el) => el.classList.contains('skip'), 
        // backgroundColor: null, 
        // logging: true,
        useCORS: true,
        allowTaint: true,
        // height: graphElement.scrollHeight, 
      }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        // this.downloadImage(imgData);
        const targetElement = document.getElementById('print_load_complete');

        if (targetElement) {
          // Create a new element
          tempDiv = document.createElement('div');
          tempDiv.id = 'chartImage'
          tempDiv.style.width = '945px'
          tempDiv.innerHTML = `<img src="${imgData}" style="width:100%;">`;

          // Insert the new element before the target element
          targetElement.parentNode.insertBefore(tempDiv, targetElement);
        }
        this.createPdf();
      }))


    //   domtoimage.toSvg(document.getElementById('observationChartWrapper'))
    //   .then(function (dataUrl) {
    //       /* do something */
    //       console.log('dataUrl',dataUrl);
    //       // this.graphimage = dataUrl
    //       let tempDiv: HTMLElement;
    //       const targetElement = document.getElementById('load_complete');

    //       //   if (targetElement) {
    //       //     // Create a new element
    //           tempDiv = document.createElement('svg');
    //           tempDiv.id = 'cartImage'
    //           tempDiv.innerHTML = dataUrl;

    //       //     // Insert the new element before the target element
    //           targetElement.parentNode.insertBefore(tempDiv, targetElement);
    //       //   }


    //   }).catch(function (error) {
    //     console.error('oops, something went wrong!', error);
    // });

    // htmlToImage.toPng(document.getElementById('observationChartWrapper'))
    // .then(function (dataUrl) {
    //   // var img = new Image();
    //   // img.src = dataUrl;
    //   let tempDiv: HTMLElement;
    //   const targetElement = document.getElementById('load_complete');
    //   tempDiv = document.createElement('div');
    //   tempDiv.id = 'cartImage'
    //   tempDiv.innerHTML = `<img src="${dataUrl}" style="width:100%;">`;
    //   targetElement.parentNode.insertBefore(tempDiv, targetElement);
    //   // document.body.appendChild(img);
    //   // this.createPdf();
    // })
    // .catch(function (error) {
    //   console.error('oops, something went wrong!', error);
    // });
    // this.createPdf();
  }

  downloadImage(imageData: string) {
    const link = document.createElement('a');
    link.href = imageData; // The base64 image data
    link.download = 'captured-image.png';  // You can change the filename here
    link.click(); // Trigger the download
  }

  createPdf() {
    // const element1 = this.dischargeSummaryElement.nativeElement;
    // if (element1) {
    //   const options = {
    //     margin:       [40,0,40,0],
    //     // filename:     'myfile.pdf',
    //     image:        { type: 'jpeg', quality: 0.98 },
    //     html2canvas:  { scale: 1 },
    //     jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
    //     pagebreak:    { avoid: ['tr','div'] }
    //   };

    //   domToPdf(element1, options, (pdf) => {
    //     var totalPages = pdf.internal.getNumberOfPages();
    //     let currTime = moment(moment()).format('HH:mm');
    //     for (let i = 1; i <= totalPages; i++) {

    //       pdf.setPage(i);
    //       // set header to every page
    //       // if(i > 1)
    //       // {
    //         pdf.setFont(undefined,'bold');
    //         pdf.setFontSize(15);
    //         pdf.text(' ' + this.appService.encounter.lastname + ', ' +  this.appService.encounter.firstname + ', ' + moment(this.appService.encounter.dateofbirth).format("d/MM/yyyy") + ', ' + this.appService.encounter.nhsnumber + ', ' + this.appService.encounter.hospitalnumber + ', ' + this.currentDate,50,20,null,null);
    //         // pdf.text(' ' + this.allergiesString, 30,45,{ maxWidth: 500 },null,null);
    //       // }

    //     // set footer to every page
    //       pdf.setFont(undefined,'normal');
    //       pdf.setFontSize(9);
    //       var today = new Date();
    //       var dd = String(today.getDate()).padStart(2, '0');
    //       var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    //       var yyyy = today.getFullYear();

    //       let date =dd + '/' + mm + '/' + yyyy;
    //       pdf.text('South London and Maudsley,' + this.appService.encounter.currentlocation + 'Admission Date:' + moment(this.appService.encounter.admitdatetime).format('dd/MM/yyyy HH:mm') + ', LoS:' +this.appService.lenghOfStay, 60,825,null,null);
    //       pdf.text('Page '+ String(i) + ' of ' + totalPages + ' Date/Time: ' + date+ ' ' + currTime,210,835,null,null);
    //     }
    //     // Convert to Blob and open in a new tab
    //     const pdfBlob = pdf.output('blob');
    //     const pdfURL = URL.createObjectURL(pdfBlob);
    //     window.open(pdfURL, '_blank');
    //     console.log('PDF successfully downloaded');
    //   });
    // } else {
    //   console.error('Element not found');
    // }

    // return;
    var element = this.dischargeSummaryElement.nativeElement;

    var opt = {
      margin: [10, 0, 10, 0],
      // filename:     'myfile.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 1 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { avoid: ['tr', 'div'] }
    };

    html2pdf().from(element).set(opt).toPdf().get('pdf').then(async (pdf) => {
      var totalPages = pdf.internal.getNumberOfPages();
      let currTime = moment(moment()).format('HH:mm');
      for (let i = 1; i <= totalPages; i++) {

        pdf.setPage(i);
        // set header to every page
        pdf.setFont(undefined, 'bold');
        pdf.setFontSize(12);
        pdf.text(' ' + this.appService.encounter.lastname + ', ' + this.appService.encounter.firstname + ', ' + moment(this.appService.encounter.dateofbirth).format("DD/MM/yyyy") + ', ' + this.appService.encounter.gender + ', ' + this.appService.encounter.nhsnumber + ', ' + this.appService.encounter.hospitalnumber + ', Report last updated: ' + this.currentDate, 10, 6, null, null);

        // set footer to every page
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(9);
        var today = new Date();
        var dd = String(today.getDate()).padStart(2, '0');
        var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
        var yyyy = today.getFullYear();

        let date = dd + '/' + mm + '/' + yyyy;
        // pdf.text('Royal National Orthopaedic Hospital Trust, Brockley Hill, Stanmore, Middlesex HA7 4LP. Tel: 020 8954 2300', 6,290,null,null);
        pdf.text('South London and Maudsley, ' + this.appService.encounter.currentlocation + ', Admission Date: ' + moment(this.appService.encounter.admitdatetime).format('DD/MM/yyyy HH:mm') + ', LoS:' + this.appService.lenghOfStay, 25, 290, null, null);
        pdf.text('Page ' + String(i) + ' of ' + totalPages + ' Date/Time: ' + date + ' ' + currTime, 80, 295, null, null);
      }
      this.isPrinting = false;
      // this.subjects.isPrinitingCompleted.next(true);
      window.open(<any>pdf.output('bloburl'), '_blank');

      const container = document.getElementById('chartImage');
      container.parentNode.removeChild(container);
    })

    // let htmlToPdfOptions = {
    //   "tableAutoSize": true, 
    //   "removeExtraBlanks": true, 
    //   "removeTagClasses": true
    // }
    // const pdfTable = this.dischargeSummaryElement.nativeElement;
    // var html = htmlToPdfmake(pdfTable.innerHTML,htmlToPdfOptions);
    // var documentDefinition = { 
    //   header: (currentPage, pageCount, pageSize) => {
    //     // you can apply any logic and return any valid pdfmake element
    //     // if(currentPage > 1)
    //     // {
    //     //   return {
    //     //     columns: [
    //     //       { text: ' ' + this.patientDetails.fullname.split(',')[0]+',  ' + this.patientDetails.fullname.split(',')[1] + ', ' + this.patientDetails.dob + ', ' + this.patientDetails.age + ', ' + this.patientDetails.gender + ', ' + this.patientDetails.hospitalnumber + ', ' + this.patientDetails.nhsnumber + ', ' + this.patientDetails.address + '\n' + this.allergiesString , alignment : 'center', style: 'header'},
    //     //       // { text: this.allergiesString , alignment : 'center', style: 'header'},
    //     //     ],
    //     //     margin: [0,10,0,10],
    //     //   } 
    //     // }

    //   },
    //   footer: function(currentPage, pageCount, pageSize) { 
    //     let currTime = moment(moment()).format('HH:mm');
    //     var today = new Date();
    //     var dd = String(today.getDate()).padStart(2, '0');
    //     var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    //     var yyyy = today.getFullYear();

    //     let date =dd + '/' + mm + '/' + yyyy;
    //     // if(printType == 'empty')
    //     // {
    //     //   return {
    //     //     columns: [
    //     //       { text: 'Prescriber to print name, sign & date:________________________', alignment : 'left',style: 'footer'},
    //     //       { text: 'Royal National Orthopaedic Hospital Trust, Brockley Hill, Stanmore, Middlesex HA7 4LP. Tel: 020 8954 2300'  , alignment : 'right', style: 'footer'},
    //     //       { text: 'Page '+currentPage.toString() + ' of ' + pageCount + ' Date/Time: ' + date+ ' ' + currTime , alignment : 'center', style: 'footer'},
    //     //     ],
    //     //     margin: [10, 10, 0, 5],
    //     //   };
    //     // }
    //     // else {
    //       return {
    //         columns: [
    //           { text: 'Royal National Orthopaedic Hospital Trust, Brockley Hill, Stanmore, Middlesex HA7 4LP. Tel: 020 8954 2300 \n Page '+currentPage.toString() + ' of ' + pageCount + ' Date/Time: ' + date+ ' ' + currTime , alignment : 'center', style: 'footer'},
    //         ],
    //         margin: [0, 5, 0, 5],
    //       } 
    //     // }
    //     // return 'Page '+currentPage.toString() + ' of ' + pageCount + ' Date/Time: ' + date+ ' ' + currTime; 
    //   },
    //   pageMargins: [10, 45, 25, 30],
    //   // pageOrientation: 'portrait', 
    //   pageSize: {width: 595, height: 842},
    //   Times: {
    //     normal: 'Times-Roman',
    //     bold: 'Times-Bold',
    //     italics: 'Times-Italic',
    //     bolditalics: 'Times-BoldItalic'
    //   },
    //   content: html,
    //   styles: {
    //     header: {
    //       fontSize: 8,
    //       italics: true,
    //       color: 'grey'
    //     },
    //     footer: {
    //       fontSize: 8,
    //       italics: true,
    //       color: 'grey'
    //     },
    //   },
    // };
    // pdfMake.createPdf(documentDefinition).open(); 
  }


  createFilter() {
    let condition = "person_id = @person_id and encounter_id = @encounter_id";
    // let condition = "personid = @personid";

    let f = new filters()
    f.filters.push(new filter(condition));

    let pm = new filterParams();
    pm.filterparams.push(new filterparam("person_id", this.appService.personId));
    pm.filterparams.push(new filterparam("encounter_id", this.appService.encounter.encounter_id));

    let select = new selectstatement("SELECT *");

    let orderby = new orderbystatement("ORDER BY datestarted desc");

    let body = [];
    body.push(f);
    body.push(pm);
    body.push(select);
    body.push(orderby);

    return JSON.stringify(body);
  }

  createWeightHeightWaistCircumferenceFilter() {
    let condition = "personid = @personid and encounterid = @encounterid";
    //let condition = "personid = @personid";
    let f = new filters()
    f.filters.push(new filter(condition));
    let pm = new filterParams();
    pm.filterparams.push(new filterparam("personid", this.appService.personId));
    pm.filterparams.push(new filterparam("encounterid", this.appService.encounter.encounter_id));
    let select = new selectstatement("SELECT *");
    let orderby = new orderbystatement("ORDER BY _sequenceid desc");
    let body = [];
    body.push(f);
    body.push(pm);
    body.push(select);
    body.push(orderby);
    return JSON.stringify(body);
  }

  isActualReize(): boolean {
 //   console.log(this.currentWindowInnerWidth)
 //   console.log(window.innerWidth)

    if (this.currentWindowInnerWidth != window.innerWidth) {
      return true;
    }
    return false;
  }

}

