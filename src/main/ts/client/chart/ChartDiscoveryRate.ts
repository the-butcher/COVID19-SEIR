import { LineSeries, LineSeriesDataItem, ValueAxis, XYChart, XYCursor } from '@amcharts/amcharts4/charts';
import { Circle, color, create, useTheme } from '@amcharts/amcharts4/core';
import am4themes_animated from '@amcharts/amcharts4/themes/animated';
import am4themes_dark from '@amcharts/amcharts4/themes/dark';
import { Demographics } from '../../common/demographics/Demographics';
import { IDiscoveryValueSet } from '../../common/modification/IDiscoveryValueSet';
import { BaseData } from '../../model/basedata/BaseData';
import { ModelInstants } from '../../model/ModelInstants';
import { StrainUtil } from '../../util/StrainUtil';
import { TimeUtil } from '../../util/TimeUtil';
import { ControlsConstants, ILabellingDefinition } from '../gui/ControlsConstants';
import { ChartUtil } from './ChartUtil';

export interface IChartDataDiscoveryRate {
    positivity: number;
    // discoveryAv: number;
    // discoveryLo: number;
    // discoveryHi: number;
    // labelLo: string;
    // labelHi: string;
    discoveryEx01?: number;
    discoveryEx02?: number;
    discoveryEx03?: number;
    discoveryEx04?: number;
    discoveryEx05?: number;
}



/**
 * chart indicating the testing / discovery rate for different age groups
 *
 * @author h.fleischer
 * @since 16.05.2021
 */
export class ChartDiscoveryRate {

    private readonly chart: XYChart;
    private readonly xAxis: ValueAxis;
    private readonly yAxis: ValueAxis;

    // private readonly seriesDiscoveryLo: LineSeries;
    // private readonly seriesDiscoveryAv: LineSeries;
    // private readonly seriesDiscoveryHi: LineSeries;

    static getInstance(): ChartDiscoveryRate {
        return this.instance;
    }
    private static instance: ChartDiscoveryRate;

    private readonly bulletSeries: LineSeries;

    private readonly seriesDiscoveryExs: LineSeries[];

    private readonly labellingDefinitionTooltip: ILabellingDefinition;

    private fullDataUpdate: boolean;

    private readonly distinctVals = [
        '01',
        '02',
        '03',
        '04',
        '05'
    ]

    constructor(container: string, yMin: number, yMax: number, labellingDefinitionAxis: ILabellingDefinition, labellingDefinitionTooltip: ILabellingDefinition) {

        useTheme(am4themes_dark);
        useTheme(am4themes_animated);

        ChartDiscoveryRate.instance = this;

        this.seriesDiscoveryExs = [];

        this.fullDataUpdate = true;
        this.labellingDefinitionTooltip = labellingDefinitionTooltip;

        this.chart = create(container, XYChart);
        this.chart.zoomOutButton.disabled = true;
        this.chart.interpolationDuration = 0;
        this.chart.sequencedInterpolation = false;
        ChartUtil.getInstance().configureChartPadding(this.chart);
        ChartUtil.getInstance().configureSeparators(this.chart);

        this.xAxis = this.chart.xAxes.push(new ValueAxis());
        this.yAxis = this.chart.yAxes.push(new ValueAxis());

        /**
         * x-axis
         */
        ChartUtil.getInstance().configureAxis(this.xAxis, 'Test positivity (%)');
        this.xAxis.renderer.labels.template.rotation = -90;
        this.xAxis.renderer.labels.template.horizontalCenter = 'right';
        this.xAxis.renderer.labels.template.verticalCenter = 'middle';
        this.xAxis.tooltip.disabled = true;
        this.xAxis.rangeChangeDuration = 0;
        this.xAxis.renderer.labels.template.adapter.add('text', (value, target) => {
            return ChartUtil.getInstance().formatLabelOrTooltipValue(value, labellingDefinitionAxis);
        });
        this.xAxis.max = 0.18;
        // this.xAxis.dataFields.category = 'positivity';

        /**
         * y-axis
         */
        ChartUtil.getInstance().configureAxis(this.yAxis, 'Population tested (%)');
        this.yAxis.tooltip.disabled = true;
        this.yAxis.renderer.labels.template.adapter.add('text', (value, target) => {
            return ChartUtil.getInstance().formatLabelOrTooltipValue(value, labellingDefinitionAxis);
        });

        this.yAxis.min = yMin;
        this.yAxis.max = yMax;
        this.yAxis.strictMinMax = true;
        this.yAxis.rangeChangeDuration = 0;


        this.distinctVals.forEach(distinctVal => {
            const seriesDiscoveryEx = this.chart.series.push(new LineSeries());
            seriesDiscoveryEx.xAxis = this.xAxis;
            seriesDiscoveryEx.yAxis = this.yAxis;
            seriesDiscoveryEx.fontFamily = ControlsConstants.FONT_FAMILY;
            seriesDiscoveryEx.fontSize = ControlsConstants.FONT_SIZE;
            seriesDiscoveryEx.dataFields.valueX = 'positivity';
            seriesDiscoveryEx.dataFields.valueY = `discoveryEx${distinctVal}`;
            seriesDiscoveryEx.fillOpacity = 0.0;
            seriesDiscoveryEx.strokeWidth = 1;
            seriesDiscoveryEx.strokeLinecap = 'round';
            seriesDiscoveryEx.strokeOpacity = 1.0;
            seriesDiscoveryEx.tooltip.disabled = true;
            seriesDiscoveryEx.interpolationDuration = 0;
            seriesDiscoveryEx.sequencedInterpolation = false;
            this.seriesDiscoveryExs.push(seriesDiscoveryEx);
        });

        this.bulletSeries = this.chart.series.push(new LineSeries());
        this.bulletSeries.dataFields.valueX = "positivity";
        this.bulletSeries.dataFields.valueY = "y";
        this.bulletSeries.dataFields.value = "radius";
        this.bulletSeries.strokeOpacity = 0.5;
        this.bulletSeries.sequencedInterpolation = false;
        this.bulletSeries.interpolationDuration = 0;

        var bullet = this.bulletSeries.bullets.push(new Circle());
        bullet.fill = color("#ffffff");
        bullet.strokeOpacity = 0;
        bullet.strokeWidth = 2;
        bullet.fillOpacity = 0.4;
        bullet.strokeOpacity = 0;
        bullet.radius = 6;
        bullet.hiddenState.properties.opacity = 0;
        bullet.tooltipText = "{date}, {discovery}";

        this.bulletSeries.tooltip.getStrokeFromObject = false;
        this.bulletSeries.tooltip.getFillFromObject = false;
        this.bulletSeries.tooltip.background.stroke = color(ControlsConstants.COLOR____FONT);
        this.bulletSeries.tooltip.background.fill = color(ControlsConstants.COLOR______BG);

        this.bulletSeries.tooltip.background.strokeWidth = 0.25;
        this.bulletSeries.tooltip.background.cornerRadius = 0;
        this.bulletSeries.tooltip.background.filters.clear();

        this.bulletSeries.tooltip.label.fontFamily = ControlsConstants.FONT_FAMILY;
        this.bulletSeries.tooltip.label.fontSize = ControlsConstants.FONT_SIZE - 2;
        this.bulletSeries.tooltip.label.fill = color(ControlsConstants.COLOR____FONT);
        this.bulletSeries.tooltip.label.paddingLeft = 3;
        this.bulletSeries.tooltip.label.paddingTop = 0;
        this.bulletSeries.tooltip.label.paddingBottom = 0;
        this.bulletSeries.tooltip.label.paddingRight = 1;

        // this.bulletSeries.heatRules.push({ target: bullet, min: 2, max: 30, property: "radius" });


        this.chart.cursor = new XYCursor();
        this.chart.cursor.xAxis = this.xAxis;
        // this.chart.cursor.yAxis = this.yAxis;
        this.chart.cursor.showTooltipOn = 'always';
        this.chart.cursor.exportable = true;
        this.chart.cursor.lineX.disabled = true;
        this.chart.cursor.lineY.disabled = true;

        // let instant = ModelInstants.getInstance().getMinInstant();
        document.addEventListener('keyup', e => {
            // instant += TimeUtil.MILLISECONDS_PER____DAY * 3;
            // this.setInstant(instant);
            if (e.key === 'r') {
                this.exportToPng();
            }
        });

    }

    async exportToPng(): Promise<void> {
        this.chart.exporting.export("png");
    }

    setInstant(instant: number): void {
        const date = TimeUtil.formatCategoryDateFull(instant);
        let datedItem: LineSeriesDataItem;
        this.bulletSeries.dataItems.each((item, index) => {
            if (item.dataContext['date'] === date) {
                datedItem = item;
            }
        });
        const point = this.bulletSeries.showTooltipAtDataItem(datedItem);
        // this.chart.cursor.triggerMove(point, 'soft');
    }

    async acceptModification(discoveryValueSet: IDiscoveryValueSet): Promise<void> {

        // console.log('contactColumns', contactColumns);

        const demographics = Demographics.getInstance();
        const chartData: IChartDataDiscoveryRate[] = [];
        // const ageGroups = demographics.getAgeGroups();

        for (let positivity = 0; positivity <= 1.0; positivity += 0.01) {

            const chartEntry = {
                positivity: positivity,
            };
            this.distinctVals.forEach(distinctVal => {
                const attributeName = `discoveryEx${distinctVal}`;
                chartEntry[attributeName] = StrainUtil.calculateDiscoveryRate(positivity, parseFloat(distinctVal) / 100, discoveryValueSet);
            });
            chartData.push(chartEntry);

        }

        const bulletData: any[] = [];
        const minInstant = ModelInstants.getInstance().getMinInstant();
        const maxInstant = ModelInstants.getInstance().getMaxInstant();
        for (let bulletInstant = minInstant; bulletInstant <= maxInstant; bulletInstant += TimeUtil.MILLISECONDS_PER____DAY) {

            const dataItem = BaseData.getInstance().findBaseDataItem(bulletInstant);
            if (dataItem) {

                const positivity = dataItem.getAveragePositivity();
                const discovery = StrainUtil.calculateDiscoveryRate(dataItem.getAveragePositivity(), dataItem.getAverageTests() / Demographics.getInstance().getAbsTotal(), discoveryValueSet);
                // console.log(TimeUtil.formatCategoryDateFull(dataItem.getInstant()), positivity);

                bulletData.push({
                    positivity,
                    y: discovery, // discovery, dataItem.getAverageTests() / Demographics.getInstance().getAbsTotal()
                    date: TimeUtil.formatCategoryDateFull(bulletInstant),
                    discovery: this.labellingDefinitionTooltip.format(discovery)
                })

            }

        }

        // console.log('bulletData', bulletData);
        // https://www.amcharts.com/demos-v4/animated-xy-bubble-timeline-chart-v4/
        this.bulletSeries.data = bulletData;
        this.seriesDiscoveryExs.forEach(seriesDiscoveryEx => {
            seriesDiscoveryEx.data = chartData;
        });

        // console.log('this.chart.data', this.chart.data, chartData);

        // this.fullDataUpdate = false;

    }

}