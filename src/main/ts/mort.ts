/* Imports */
import * as am4charts from "@amcharts/amcharts4/charts";
import * as am4core from "@amcharts/amcharts4/core";
import { JsonLoader } from "./util/JsonLoader";
import { TimeUtil } from "./util/TimeUtil";


export type ICharData = {
    date: Date;
    ci68Lower: number;
    ci68Upper: number;
    ci95Lower: number;
    ci95Upper: number;
    mortAvg: number;
    mortVal?: number;
}

let chart = am4core.create("chartdiv", am4charts.XYChart);
// chart.data = data;
chart.legend = new am4charts.Legend();

// chart.dataSource.url = "/data/mortality_data.json";

let dateAxis = chart.xAxes.push(new am4charts.DateAxis());
// dateAxis.title.text = "Datum";
dateAxis.renderer.labels.template.rotation = -90;
dateAxis.renderer.labels.template.horizontalCenter = 'right';
dateAxis.renderer.labels.template.verticalCenter = 'middle';
dateAxis.renderer.labels.template.adapter.add('text', (value, target) => {
    if (target.dataItem?.dates?.date) {
        const date = target.dataItem.dates.date;
        return `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getFullYear()).padStart(2, '0')}`
    } else {
        return value;
    }
});
dateAxis.max = new Date('2022-06-01').getTime();
dateAxis.strictMinMax = true;
dateAxis.gridIntervals.setAll([
    { timeUnit: "month", count: 3 }
]);
dateAxis.baseInterval = { timeUnit: "day", count: 1 };

let valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
valueAxis.min = 0;
valueAxis.max = 50;
valueAxis.tooltip.disabled = true;
valueAxis.title.text = "Sterblichkeit / Woche / 100.000";

let valueAxisIncidence = chart.yAxes.push(new am4charts.ValueAxis());
valueAxisIncidence.min = 0;
valueAxisIncidence.max = 9000;
valueAxisIncidence.tooltip.disabled = true;
valueAxisIncidence.renderer.grid.template.disabled = true;
valueAxisIncidence.renderer.labels.template.disabled = true;
// valueAxisIncidence.title.text = "Sterblichkeit / Woche / 100.000";

const ciColor = '#aaaaaa';

const seriesCi95Upper = chart.series.push(new am4charts.LineSeries());
seriesCi95Upper.dataFields.dateX = "date";
seriesCi95Upper.dataFields.openValueY = "ci95Lower";
seriesCi95Upper.dataFields.valueY = "ci95Upper";
seriesCi95Upper.fillOpacity = 0.30;
seriesCi95Upper.fill = am4core.color(ciColor);
seriesCi95Upper.strokeOpacity = 0.0;
seriesCi95Upper.hiddenInLegend = true;

let seriesCi95Lower = chart.series.push(new am4charts.LineSeries());
seriesCi95Lower.dataFields.dateX = "date";
seriesCi95Lower.dataFields.valueY = "ci95Lower";
seriesCi95Lower.fill = am4core.color(ciColor);
seriesCi95Lower.strokeOpacity = 0.0;
seriesCi95Lower.hiddenInLegend = true;

const seriesCi68Upper = chart.series.push(new am4charts.LineSeries());
seriesCi68Upper.dataFields.dateX = "date";
seriesCi68Upper.dataFields.openValueY = "ci68Lower";
seriesCi68Upper.dataFields.valueY = "ci68Upper";
seriesCi68Upper.fillOpacity = 0.30;
seriesCi68Upper.fill = am4core.color(ciColor);
seriesCi68Upper.strokeOpacity = 0.0;
seriesCi68Upper.hiddenInLegend = true;

let seriesCi68Lower = chart.series.push(new am4charts.LineSeries());
seriesCi68Lower.dataFields.dateX = "date";
seriesCi68Lower.dataFields.valueY = "ci68Lower";
seriesCi68Lower.stroke = am4core.color(ciColor);
seriesCi68Lower.strokeOpacity = 0.0;
seriesCi68Lower.hiddenInLegend = true;

let seriesIncidence = chart.series.push(new am4charts.LineSeries());
seriesIncidence.yAxis = valueAxisIncidence;
seriesIncidence.name = '7-Tages-Inzidenz';
seriesIncidence.dataFields.dateX = "date";
seriesIncidence.dataFields.valueY = "incidence";
seriesIncidence.stroke = am4core.color('#000000');
seriesIncidence.fill = am4core.color('#000000');
seriesIncidence.fillOpacity = 0.1;
seriesIncidence.strokeOpacity = 0.2;
seriesIncidence.strokeWidth = 0;
seriesIncidence.strokeLinecap = 'round';

let seriesVal = chart.series.push(new am4charts.LineSeries());
seriesVal.name = 'Sterblichkeit';
seriesVal.dataFields.dateX = "date";
seriesVal.dataFields.valueY = "mortVal";
seriesVal.stroke = am4core.color('#000000');
seriesVal.strokeWidth = 5;
seriesVal.strokeLinecap = 'round';

let seriesP95 = chart.series.push(new am4charts.LineSeries());
seriesP95.name = 'Sterblichkeit > CI95';
seriesP95.dataFields.dateX = "date";
seriesP95.dataFields.valueY = "mortP95";
seriesP95.stroke = am4core.color('#CC0000');
seriesP95.strokeWidth = 5;
// seriesP95.strokeOpacity = 0.5;
seriesP95.strokeLinecap = 'round';
seriesP95.connect = false;
// seriesP95.strokeDasharray = '4, 2';

let seriesAvg = chart.series.push(new am4charts.LineSeries());
seriesAvg.name = 'Sterblichkeit 2016-2019 / CI68 / CI95';
seriesAvg.dataFields.dateX = "date";
seriesAvg.dataFields.valueY = "mortAvg";
seriesAvg.stroke = am4core.color('#000000');
seriesAvg.strokeWidth = 3;
seriesAvg.strokeOpacity = 0.1;
seriesAvg.strokeLinecap = 'round';
// seriesAvg.strokeDasharray = '20, 5, 1, 5';

const titleContainer = chart.chartContainer.createChild(am4core.Container);
titleContainer.layout = "absolute";
titleContainer.toBack();
titleContainer.width = am4core.percent(100);
titleContainer.paddingBottom = 10;
titleContainer.exportable = true;

const chartTitle = titleContainer.createChild(am4core.Label);
chartTitle.text = 'Österreich';
chartTitle.align = "center";
chartTitle.dx = -200;
chartTitle.exportable = true;

let dateTitle = titleContainer.createChild(am4core.Label);
dateTitle.text = `@FleischerHannes, ${TimeUtil.formatCategoryDateFull(Date.now())} - https://www.statistik.at`; //https://ec.europa.eu/eurostat; // https://www.statistik.at;
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

// https://www.kleinezeitung.at/politik/innenpolitik/6056751/Lockdowns-und-Lockerungen_Chronologie-der-Pandemie

let postFix = '-9'; // -9

/**
 * 1 - Burgenland - ältestes Bundesland - breites Intervall Q1 - trotzdem bei Wildtyp am Rand CI97 - Übersterblichkeit waährend Lockdown Ost
 * 2 - Kärnten - auch alt - sehr hoher Peak in der Winterwelle 2020, viele Delta-Tote (TODO :: vergleich mit offiziellen COVID Zahlen, underreporting?, TODO :: impfzahlen bei Deltawelle)
 * 3 - Niederösterreich - 1. Welle unauffällig
 * 4 - Oberösterreich - junges Bundesland - früher Anstieg Sommer 2021 sichtbar - Wahlen zu der Zeit - aktuell über Durchschnitt
 * 5 - Salzburg - aktuell über Durchschnitt - (TODO :: was ist im Juli 2021?)
 * 6 - Steiermark - hoher Peak in Winterwelle 2020 - will aus CI95 wandern (TODO :: aktuell am schlechtesten dastehendes Bundesland?)
 * 7 - Tirol - rel hoher Peak 2020 - aktuell über Durchschnitt - Anfang 2021 deutlich unter Schnitt
 * 8 - Vorarlberg - will aus CI95 wandern (TODO :: aktuell am schlechtesten dastehendes Bundesland?)
 * 9 - Wien - jüngestes Bundesland - Übersterblichkeit während Lockdown Ost (nur wien und burgenland)
 */

createRange(new Date('2020-03-16'), new Date('2020-05-01'), 'Lockdown I', 0.15);
createRange(new Date('2020-11-17'), new Date('2020-12-07'), 'Lockdown II', 0.15);
createRange(new Date('2020-12-26'), new Date('2021-02-21'), 'Lockdown III', 0.15);
if (postFix === '-1' || postFix === '-3' || postFix === '-9') {
    createRange(new Date('2021-04-01'), new Date('2021-05-03'), 'Lockdown Ost', 0.15);
} else if (postFix === '') {
    createRange(new Date('2021-04-01'), new Date('2021-05-03'), 'Lockdown Ost', 0.08);
}
createRange(new Date('2021-11-22'), new Date('2021-12-12'), 'Lockdown IV', 0.10);
createRange(new Date('2021-11-15'), new Date('2022-02-31'), 'Lockdown ungeimpft', 0.10);

// burgenland
if (postFix === '-1') {
    createRange(new Date('2020-02-25'), new Date('2020-02-25'), 'hoher saisonaler Peak', 0.10);
}

// kärnten
if (postFix === '-2') {
    createRange(new Date('2020-11-22'), new Date('2020-11-22'), 'hoher Peak', 0.10);
}

// oberösterreich
if (postFix === '-4') {
    createRange(new Date('2021-09-26'), new Date('2021-09-26'), 'Wahlen', 0.10);
}

// Tirol
if (postFix === '-7') {

}
if (postFix === '-9') {

}


// createRange(new Date('2022-02-21'), new Date('2022-02-21'), 'maskenpflicht ende\n(schule / am platz)', 0.10);

document.addEventListener('keyup', e => {
    if (e.key === 'x') {
        chart.exporting.export("png");
    }
});

new JsonLoader().load('/data/mortality-data-at' + postFix + '.json').then(rawData => {

    chartTitle.text = rawData.name;
    seriesAvg.name = `Sterblichkeit ${rawData.minYear}-${rawData.maxYear} / CI68 / CI95`;

    const dates = Object.keys(rawData.data);

    let chartData: ICharData[] = [];
    dates.forEach(date => {

        const rawDataItem = rawData.data[date];
        chartData.push({
            date: new Date(date),
            mortP95: rawDataItem.mortVal > rawDataItem.ci95Upper ? rawDataItem.mortVal : null,
            ...rawDataItem
        });

    });
    chart.data = chartData;

});
