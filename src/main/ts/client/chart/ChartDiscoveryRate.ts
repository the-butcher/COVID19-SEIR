import { CategoryAxis, LineSeries, ValueAxis, XYChart, XYCursor } from '@amcharts/amcharts4/charts';
import { color, create, Label, useTheme } from '@amcharts/amcharts4/core';
import am4themes_animated from '@amcharts/amcharts4/themes/animated';
import am4themes_dark from '@amcharts/amcharts4/themes/dark';
import { Demographics } from '../../common/demographics/Demographics';
import { ModificationResolverSettings } from '../../common/modification/ModificationResolverSettings';
import { ModificationSettings } from '../../common/modification/ModificationSettings';
import { StrainUtil } from '../../util/StrainUtil';
import { ControlsConstants, ILabellingDefinition } from '../gui/ControlsConstants';
import { ModificationTime } from './../../common/modification/ModificationTime';
import { ChartUtil } from './ChartUtil';

export interface IChartDataDiscoveryRate {
    positivity: string;
    discoveryAv: number;
    discoveryLo: number;
    discoveryHi: number;
    label: string;
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

    private readonly labellingDefinitionTooltip: ILabellingDefinition;

    private fullDataUpdate: boolean;

    constructor(container: string, yMin: number, yMax: number, labellingDefinitionAxis: ILabellingDefinition, labellingDefinitionTooltip: ILabellingDefinition) {

        useTheme(am4themes_dark);
        useTheme(am4themes_animated);

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

        this.seriesDiscoveryAv.tooltipText = 'positivity:\u00A0{categoryX}\ndiscovery:\u00A0\u00A0{label}';
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

    async acceptModificationSettings(modificationSettings: ModificationSettings): Promise<void> {

        // console.log('contactColumns', contactColumns);

        const demographics = Demographics.getInstance();
        const chartData: IChartDataDiscoveryRate[] = [];
        const ageGroups = demographics.getAgeGroups();

        for (let positivity = 0; positivity <= 0.2; positivity += 0.01) {

            const discoveryLo = modificationSettings.calculateDiscoveryRate(positivity, 0.01);
            const discoveryAv = modificationSettings.calculateDiscoveryRate(positivity, 0.03);
            const discoveryHi = modificationSettings.calculateDiscoveryRate(positivity, 0.05);

            chartData.push({
                positivity: this.labellingDefinitionTooltip.format(positivity),
                discoveryAv,
                discoveryLo,
                discoveryHi,
                label: this.labellingDefinitionTooltip.format(discoveryAv)
            });
        }

        if (this.fullDataUpdate) {
            this.chart.data = chartData;
            this.fullDataUpdate = false;
        } else {
            const keys = Object.keys(chartData[0]);
            for (let i = 0; i < chartData.length; i++) {
                if (this.chart.data[i].discoveryAv) {
                    // this.chart.data[i].positivity = chartData[i].positivity;
                    this.chart.data[i].discoveryAv = chartData[i].discoveryAv;
                    this.chart.data[i].discoveryLo = chartData[i].discoveryLo;
                    this.chart.data[i].discoveryHi = chartData[i].discoveryHi;
                    this.chart.data[i].label = chartData[i].label;
                }
            }
        }
        this.chart.invalidateRawData();

        this.fullDataUpdate = false;

    }

}