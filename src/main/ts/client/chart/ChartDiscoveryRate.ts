import { CategoryAxis, LineSeries, ValueAxis, XYChart, XYCursor } from '@amcharts/amcharts4/charts';
import { create, useTheme } from '@amcharts/amcharts4/core';
import am4themes_animated from '@amcharts/amcharts4/themes/animated';
import am4themes_dark from '@amcharts/amcharts4/themes/dark';
import { Demographics } from '../../common/demographics/Demographics';
import { IDiscoveryValueSet } from '../../common/modification/IDiscoveryValueSet';
import { StrainUtil } from '../../util/StrainUtil';
import { ControlsConstants, ILabellingDefinition } from '../gui/ControlsConstants';
import { ChartUtil } from './ChartUtil';

export interface IChartDataDiscoveryRate {
    positivity: string;
    discoveryAv: number;
    discoveryLo: number;
    discoveryHi: number;
    labelLo: string;
    labelHi: string;
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
    private readonly xAxis: CategoryAxis;
    private readonly yAxis: ValueAxis;

    private readonly seriesDiscoveryLo: LineSeries;
    private readonly seriesDiscoveryAv: LineSeries;
    private readonly seriesDiscoveryHi: LineSeries;

    private readonly seriesDiscoveryExs: { [K in string]: LineSeries };

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

        this.seriesDiscoveryExs = {};

        this.fullDataUpdate = true;
        this.labellingDefinitionTooltip = labellingDefinitionTooltip;

        this.chart = create(container, XYChart);
        this.chart.zoomOutButton.disabled = true;
        ChartUtil.getInstance().configureChartPadding(this.chart);
        ChartUtil.getInstance().configureSeparators(this.chart);

        this.xAxis = this.chart.xAxes.push(new CategoryAxis());
        this.yAxis = this.chart.yAxes.push(new ValueAxis());

        /**
         * x-axis
         */
        ChartUtil.getInstance().configureAxis(this.xAxis, 'Positivity');
        this.xAxis.renderer.labels.template.rotation = -90;
        this.xAxis.renderer.labels.template.horizontalCenter = 'right';
        this.xAxis.renderer.labels.template.verticalCenter = 'middle';
        this.xAxis.tooltip.disabled = true;
        this.xAxis.dataFields.category = 'positivity';

        /**
         * y-axis
         */
        ChartUtil.getInstance().configureAxis(this.yAxis, 'Discovery');
        this.yAxis.tooltip.disabled = true;
        this.yAxis.renderer.labels.template.adapter.add('text', (value, target) => {
            return ChartUtil.getInstance().formatLabelOrTooltipValue(value, labellingDefinitionAxis);
        });

        this.yAxis.min = yMin;
        this.yAxis.max = yMax;
        this.yAxis.strictMinMax = true;


        this.distinctVals.forEach(distinctVal => {
            const seriesDiscoveryEx = this.chart.series.push(new LineSeries());
            seriesDiscoveryEx.xAxis = this.xAxis;
            seriesDiscoveryEx.yAxis = this.yAxis;
            seriesDiscoveryEx.fontFamily = ControlsConstants.FONT_FAMILY;
            seriesDiscoveryEx.fontSize = ControlsConstants.FONT_SIZE;
            seriesDiscoveryEx.dataFields.categoryX = 'positivity';
            seriesDiscoveryEx.dataFields.valueY = `discoveryEx${distinctVal}`;
            seriesDiscoveryEx.fillOpacity = 0.0;
            seriesDiscoveryEx.strokeWidth = 1;
            seriesDiscoveryEx.strokeLinecap = 'round';
            seriesDiscoveryEx.strokeOpacity = 1.0;
            seriesDiscoveryEx.tooltip.disabled = true;
        });

        this.seriesDiscoveryLo = this.chart.series.push(new LineSeries());
        this.seriesDiscoveryLo.xAxis = this.xAxis;
        this.seriesDiscoveryLo.yAxis = this.yAxis;
        this.seriesDiscoveryLo.fontFamily = ControlsConstants.FONT_FAMILY;
        this.seriesDiscoveryLo.fontSize = ControlsConstants.FONT_SIZE;
        this.seriesDiscoveryLo.dataFields.categoryX = 'positivity';
        this.seriesDiscoveryLo.dataFields.valueY = 'discoveryLo';
        this.seriesDiscoveryLo.fillOpacity = 0.0;
        this.seriesDiscoveryLo.strokeWidth = 1;
        this.seriesDiscoveryLo.strokeLinecap = 'round';
        this.seriesDiscoveryLo.strokeOpacity = 1.0;
        this.seriesDiscoveryLo.tooltip.disabled = true;

        this.seriesDiscoveryHi = this.chart.series.push(new LineSeries());
        this.seriesDiscoveryHi.xAxis = this.xAxis;
        this.seriesDiscoveryHi.yAxis = this.yAxis;
        this.seriesDiscoveryHi.fontFamily = ControlsConstants.FONT_FAMILY;
        this.seriesDiscoveryHi.fontSize = ControlsConstants.FONT_SIZE;
        this.seriesDiscoveryHi.dataFields.categoryX = 'positivity';
        this.seriesDiscoveryHi.dataFields.valueY = 'discoveryHi';
        this.seriesDiscoveryHi.fillOpacity = 0.0;
        this.seriesDiscoveryHi.strokeWidth = 1;
        this.seriesDiscoveryHi.strokeLinecap = 'round';
        this.seriesDiscoveryHi.strokeOpacity = 1.0;
        this.seriesDiscoveryHi.tooltip.disabled = true;

        this.seriesDiscoveryAv = this.chart.series.push(new LineSeries());
        this.seriesDiscoveryAv.xAxis = this.xAxis;
        this.seriesDiscoveryAv.yAxis = this.yAxis;
        this.seriesDiscoveryAv.fontFamily = ControlsConstants.FONT_FAMILY;
        this.seriesDiscoveryAv.fontSize = ControlsConstants.FONT_SIZE;
        this.seriesDiscoveryAv.dataFields.categoryX = 'positivity';
        this.seriesDiscoveryAv.dataFields.valueY = 'discoveryAv';
        this.seriesDiscoveryAv.fillOpacity = 0.0;
        this.seriesDiscoveryAv.strokeWidth = 2;
        this.seriesDiscoveryAv.strokeLinecap = 'round';
        this.seriesDiscoveryAv.strokeOpacity = 1.0;
        this.seriesDiscoveryAv.tooltip.disabled = false;

        this.seriesDiscoveryAv.tooltipText = 'positivity:\u00A0{categoryX}\ndiscovery1:\u00A0\u00A0{labelLo}\ndiscovery3:\u00A0\u00A0{labelHi}';
        ChartUtil.getInstance().configureSeries(this.seriesDiscoveryAv, ControlsConstants.COLOR____FONT, false);

        // this.seriesDiscoveryAv.adapter.add('tooltipText', (value, target) => {
        //     console.log(value, target);
        //     return '123';
        //     const indexCurr = target.tooltipDataItem.index;
        //     if (indexCurr >= 0 && target.dataItems.values.length > indexCurr) {
        //         const chartData = target.dataItems.values[indexCurr]?.dataContext as IChartDataDiscoveryRate;
        //         const rate = chartData.positivity.toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_2);
        //         // if (this.axisDirection === 'CONTACT_PARTICIPANT') {
        //         return `${ChartUtil.getInstance().formatContactLine('contact', rate)}\n${ChartUtil.getInstance().formatContactLine('rate', rate)}`;
        //         // } else {
        //         //     return `${ChartUtil.getInstance().formatContactLine('participant', chartData.plotX)}\n${ChartUtil.getInstance().formatContactLine('rate', rate)}`;
        //         // }
        //     }
        // });

        this.chart.cursor = new XYCursor();
        this.chart.cursor.xAxis = this.xAxis;
        // this.chart.cursor.yAxis = this.yAxis;
        this.chart.cursor.showTooltipOn = 'always';
        this.chart.cursor.exportable = true;
        this.chart.cursor.lineX.disabled = true;
        this.chart.cursor.lineY.disabled = true;

        this.chart.events.on('ready', e => {
            (this.seriesDiscoveryAv.bulletsContainer.element.node.parentNode as SVGGElement).setAttributeNS(null, 'clip-path', '');
            setTimeout(() => {

            }, 100);
        });

    }

    async acceptModification(discoveryValueSet: IDiscoveryValueSet): Promise<void> {

        // console.log('contactColumns', contactColumns);

        const demographics = Demographics.getInstance();
        const chartData: IChartDataDiscoveryRate[] = [];
        const ageGroups = demographics.getAgeGroups();

        for (let positivity = 0; positivity <= 1.0; positivity += 0.01) {

            const discoveryLo = StrainUtil.calculateDiscoveryRate(positivity, 0.01, discoveryValueSet);
            const discoveryAv = StrainUtil.calculateDiscoveryRate(positivity, 0.03, discoveryValueSet);
            const discoveryHi = StrainUtil.calculateDiscoveryRate(positivity, 0.05, discoveryValueSet);

            const chartEntry = {
                positivity: this.labellingDefinitionTooltip.format(positivity),
                discoveryAv,
                discoveryLo,
                discoveryHi,
                labelLo: this.labellingDefinitionTooltip.format(discoveryLo),
                labelHi: this.labellingDefinitionTooltip.format(discoveryHi)
            };
            this.distinctVals.forEach(distinctVal => {
                const attributeName = `discoveryEx${distinctVal}`;
                chartEntry[attributeName] = StrainUtil.calculateDiscoveryRate(positivity, parseFloat(distinctVal) / 100, discoveryValueSet);
            });
            chartData.push(chartEntry);

        }

        if (this.fullDataUpdate) {
            this.chart.data = chartData;
            this.fullDataUpdate = false;
        } else {
            const keys = Object.keys(chartData[0]);
            for (let i = 0; i < chartData.length; i++) {
                if (this.chart.data[i].discoveryAv) {
                    this.chart.data[i].positivity = chartData[i].positivity;
                    this.chart.data[i].discoveryAv = chartData[i].discoveryAv;
                    this.chart.data[i].discoveryLo = chartData[i].discoveryLo;
                    this.chart.data[i].discoveryHi = chartData[i].discoveryHi;
                    this.chart.data[i].labelLo = chartData[i].labelLo;
                    this.chart.data[i].labelHi = chartData[i].labelHi;
                    this.chart.data[i].discoveryEx01 = chartData[i].discoveryEx01;
                    this.chart.data[i].discoveryEx02 = chartData[i].discoveryEx02;
                    this.chart.data[i].discoveryEx03 = chartData[i].discoveryEx03;
                    this.chart.data[i].discoveryEx04 = chartData[i].discoveryEx04;
                    this.chart.data[i].discoveryEx05 = chartData[i].discoveryEx05;
                }
            }
        }
        this.chart.invalidateRawData();

        console.log('this.chart.data', this.chart.data, chartData);

        this.fullDataUpdate = false;

    }

}