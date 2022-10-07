/* Imports */
import { indexOf } from "@amcharts/amcharts4/.internal/core/utils/Array";
import * as am4charts from "@amcharts/amcharts4/charts";
import * as am4core from "@amcharts/amcharts4/core";
import { Color } from "./util/Color";
import { CSVLoader } from "./util/CSVLoader";
import { InterpolatedValue } from "./util/InterpolatedValue";
import { JsonLoader } from "./util/JsonLoader";
import { TimeUtil } from "./util/TimeUtil";

// Time(dd/mm/yyyy),Carbon dioxide(ppm),Temperature(°C),Relative humidity(%),Atmospheric pressure(hPa)

export type IChartData = {
    date: Date;
    co2: number;
    co2stroke: am4core.Color;
    deg: number;
    rhm: number; // relative humidity
    hpa: number;
}

let chart = am4core.create("chartdiv", am4charts.XYChart);
// chart.data = data;
// chart.legend = new am4charts.Legend();

// chart.dataSource.url = "/data/mortality_data.json";

let dateAxis = chart.xAxes.push(new am4charts.DateAxis());
// dateAxis.title.text = "Datum";
dateAxis.renderer.labels.template.rotation = -90;
// dateAxis.renderer.labels.template.horizontalCenter = 'right';
dateAxis.renderer.labels.template.verticalCenter = 'middle';
dateAxis.renderer.labels.template.adapter.add('text', (value, target) => {
    if (target.dataItem?.dates?.date) {
        const date = target.dataItem.dates.date;
        return date.toLocaleTimeString(); // `${String(date.getDate() + 1).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getFullYear()).padStart(2, '0')}`
    } else {
        return value;
    }
});
dateAxis.min = new Date('2022-10-01 08:30:00').getTime();
dateAxis.max = new Date('2022-10-01 15:30:00').getTime();
// dateAxis.max = new Date('2022-10-02').getTime();
// dateAxis.strictMinMax = true;
dateAxis.gridIntervals.setAll([
    { timeUnit: "minute", count: 15 }
]);
dateAxis.baseInterval = { timeUnit: "minute", count: 1 };

let co2Axis = chart.yAxes.push(new am4charts.ValueAxis());
co2Axis.min = 0;
co2Axis.max = 5500;
co2Axis.tooltip.disabled = true;
co2Axis.title.html = "CO<sub>2</sub> ppm";

let degAxis = chart.yAxes.push(new am4charts.ValueAxis());
// degAxis.min = 18;
// degAxis.max = 22;
degAxis.tooltip.disabled = true;
degAxis.title.text = "°C";
degAxis.disabled = true;

const ciColor = '#aaaaaa';



let seriesCo2 = chart.series.push(new am4charts.LineSeries());
seriesCo2.name = 'CO2';
seriesCo2.dataFields.dateX = "date";
seriesCo2.dataFields.valueY = "co2";
seriesCo2.stroke = am4core.color('#000000');
seriesCo2.strokeWidth = 10;
seriesCo2.strokeLinecap = 'round';
seriesCo2.strokeLinejoin = 'round';
seriesCo2.yAxis = co2Axis;
seriesCo2.propertyFields.stroke = "co2stroke";

let seriesDeg = chart.series.push(new am4charts.LineSeries());
seriesDeg.name = '°C';
seriesDeg.dataFields.dateX = "date";
seriesDeg.dataFields.valueY = "deg";
seriesDeg.stroke = am4core.color('#000000');
seriesDeg.strokeWidth = 4;
seriesDeg.strokeLinecap = 'round';
seriesDeg.yAxis = degAxis;

const titleContainer = chart.chartContainer.createChild(am4core.Container);
titleContainer.layout = "absolute";
titleContainer.toBack();
titleContainer.width = am4core.percent(100);
titleContainer.paddingBottom = 10;
titleContainer.exportable = true;

const chartTitle = titleContainer.createChild(am4core.Label);
chartTitle.text = 'CO2 Schulung';
chartTitle.align = "center";
chartTitle.dx = -200;
chartTitle.exportable = true;

let dateTitle = titleContainer.createChild(am4core.Label);
dateTitle.text = `@FleischerHannes, ${TimeUtil.formatCategoryDateFull(Date.now())}`;
dateTitle.align = "right";
dateTitle.dy = 2;
dateTitle.dx = -40;
dateTitle.exportable = true;

const createRange = (date1: Date, date2: Date, text: string, opacity: number) => {

    const axisRange = dateAxis.axisRanges.create();
    axisRange.value = date1.getTime();
    axisRange.endValue = date2.getTime();
    axisRange.label.inside = true;

    var pattern = new am4core.LinePattern();
    pattern.width = 7;
    pattern.height = 7;
    pattern.strokeWidth = 1;
    pattern.stroke = am4core.color('#000000');
    pattern.rotation = 45;


    axisRange.axisFill.fill = pattern;
    axisRange.axisFill.fillOpacity = opacity;

    axisRange.axisFill.stroke = am4core.color('#ff0000');
    axisRange.axisFill.strokeOpacity = 0.0;
    axisRange.grid.strokeOpacity = 0.0;


    if (date1.getTime() === date2.getTime()) {
        axisRange.grid.strokeOpacity = 0.5;
        axisRange.grid.strokeDasharray = '5, 2';
    }

    axisRange.label.visible = false;

    const axisRangeBullet = new am4charts.Bullet();
    const axisRangeLabel = axisRangeBullet.createChild(am4core.Label);
    axisRangeLabel.dy = -5;
    axisRangeLabel.rotation = -90;
    axisRangeLabel.text = text;
    axisRangeLabel.strokeOpacity = 0;
    axisRangeLabel.fillOpacity = 0.50;

    axisRangeBullet.adapter.add('x', (value, target) => {
        const axisEndPoint = dateAxis.dateToPoint(date2);
        return axisEndPoint.x - 20;
    });

    axisRange.bullet = axisRangeBullet;


}

createRange(new Date('2022-10-01 09:00:00'), new Date('2022-10-01 10:10:00'), 'Ein Fenster gekippt', 0.15);
createRange(new Date('2022-10-01 10:15:00'), new Date('2022-10-01 10:35:00'), 'Querlüftung', 0.15);
createRange(new Date('2022-10-01 10:40:00'), new Date('2022-10-01 12:10:00'), 'Ein Fenster gekippt', 0.15);
createRange(new Date('2022-10-01 12:15:00'), new Date('2022-10-01 12:45:00'), 'Ein Fenster gekippt', 0.15);
createRange(new Date('2022-10-01 12:50:00'), new Date('2022-10-01 13:30:00'), 'Querlüftung', 0.15);
createRange(new Date('2022-10-01 14:25:00'), new Date('2022-10-01 15:00:00'), 'Ein Fenster gekippt', 0.15);

document.addEventListener('keyup', e => {
    if (e.key === 'x') {
        chart.exporting.export("png");
    }
});

new CSVLoader().load('/data/aranet4.csv').then(dataset => {

    chartTitle.html = 'CO<sub>2</sub> im Schulungsraum, 01.10.2022';

    const header = dataset[0];
    dataset = dataset.slice(1);
    console.log("data", header, dataset);

    // 1995-12-17T03:24:00
    // 30/09/2022 16:46:59
    let chartData: IChartData[] = [];
    for (const data of dataset) {
        // const date = new Date(data[0]);

        const dateCol = data['col0'] as string;

        let indexA = 0;
        let indexB = dateCol.indexOf('/', indexA);
        const dayRaw = parseInt(dateCol.substring(indexA, indexB));

        indexA = indexB + 1;
        indexB = dateCol.indexOf('/', indexA);
        const monthRaw = parseInt(dateCol.substring(indexA, indexB)) - 1;

        indexA = indexB + 1;
        indexB = dateCol.indexOf(' ', indexA);
        const yearRaw = parseInt(dateCol.substring(indexA, indexB));

        indexA = indexB + 1;
        indexB = dateCol.indexOf(':', indexA);
        const hourRaw = parseInt(dateCol.substring(indexA, indexB));

        indexA = indexB + 1;
        indexB = dateCol.indexOf(':', indexA);
        const minuteRaw = parseInt(dateCol.substring(indexA, indexB));

        const co2 = parseInt(data['col1']);
        const interpolator = new InterpolatedValue(0.33, 0.00, 800, 1700, 1.0);

        chartData.push({
            date: new Date(yearRaw, monthRaw, dayRaw, hourRaw, minuteRaw, 0),
            co2,
            co2stroke: am4core.color(new Color(interpolator.getOut(co2), 1, 0.9).getHex()),
            deg: parseFloat(data['col2']?.replaceAll(',', '.')),
            rhm: parseInt(data['col3']),
            hpa: parseInt(data['col4']),
        });

    }

    console.log('chartData', chartData);

    chart.data = chartData;

});
