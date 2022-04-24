import { CategoryAxis, LineSeries, ValueAxis, XYChart, XYCursor } from '@amcharts/amcharts4/charts';
import { color, create, Label, useTheme } from '@amcharts/amcharts4/core';
import am4themes_animated from '@amcharts/amcharts4/themes/animated';
import am4themes_dark from '@amcharts/amcharts4/themes/dark';
import { Demographics } from '../../common/demographics/Demographics';
import { ControlsConstants, ILabellingDefinition } from '../gui/ControlsConstants';
import { ModificationTime } from './../../common/modification/ModificationTime';
import { ChartUtil } from './ChartUtil';

export interface IChartDataDiscovery {
    contactX: string;
    contactRatio: number;
    discoveryRatio: number;
    label: string;
}

/**
 * chart indicating the testing / discovery rate for different age groups
 *
 * @author h.fleischer
 * @since 16.05.2021
 */
export class ChartDiscovery {

    private readonly chart: XYChart;
    private readonly xAxis: CategoryAxis;
    private readonly yAxisDiscovery: ValueAxis;
    private readonly seriesDiscovery: LineSeries;
    private readonly valueTotalLabel: Label;

    // private readonly labellingDefinitionAxis: ILabellingDefinition;
    private readonly labellingDefinitionTooltip: ILabellingDefinition;

    private fullDataUpdate: boolean;

    constructor(container: string, yMin: number, yMax: number, labellingDefinitionAxis: ILabellingDefinition, labellingDefinitionTooltip: ILabellingDefinition) {

        useTheme(am4themes_dark);
        useTheme(am4themes_animated);

        this.fullDataUpdate = true;
        // this.labellingDefinitionAxis = labellingDefinitionAxis;
        this.labellingDefinitionTooltip = labellingDefinitionTooltip;

        this.chart = create(container, XYChart);
        this.chart.zoomOutButton.disabled = true;
        ChartUtil.getInstance().configureChartPadding(this.chart);
        ChartUtil.getInstance().configureSeparators(this.chart);

        this.xAxis = this.chart.xAxes.push(new CategoryAxis());
        this.yAxisDiscovery = this.chart.yAxes.push(new ValueAxis());

        this.xAxis.dataFields.category = 'contactX';

        /**
         * x-axis
         */
        ChartUtil.getInstance().configureAxis(this.xAxis, 'Contact');
        this.xAxis.renderer.labels.template.rotation = -90;
        this.xAxis.renderer.labels.template.horizontalCenter = 'right';
        this.xAxis.renderer.labels.template.verticalCenter = 'middle';
        this.xAxis.tooltip.disabled = true;

        /**
         * y-axis
         */
        ChartUtil.getInstance().configureAxis(this.yAxisDiscovery, 'cases discovered');
        this.yAxisDiscovery.tooltip.disabled = true;
        this.yAxisDiscovery.renderer.labels.template.adapter.add('text', (value, target) => {
            return ChartUtil.getInstance().formatLabelOrTooltipValue(value, labellingDefinitionAxis);
        });

        this.yAxisDiscovery.min = yMin;
        this.yAxisDiscovery.max = yMax;
        this.yAxisDiscovery.strictMinMax = true;

        this.seriesDiscovery = this.chart.series.push(new LineSeries());
        this.seriesDiscovery.xAxis = this.xAxis;
        this.seriesDiscovery.yAxis = this.yAxisDiscovery;
        this.seriesDiscovery.fontFamily = ControlsConstants.FONT_FAMILY;
        this.seriesDiscovery.fontSize = ControlsConstants.FONT_SIZE;
        this.seriesDiscovery.dataFields.categoryX = 'contactX';
        this.seriesDiscovery.dataFields.valueY = 'discoveryRatio';
        this.seriesDiscovery.fillOpacity = 0.2;
        this.seriesDiscovery.strokeWidth = 1;
        this.seriesDiscovery.strokeLinecap = 'round';
        this.seriesDiscovery.strokeOpacity = 1.0;
        this.seriesDiscovery.tooltip.disabled = false;
        this.seriesDiscovery.tooltipText = 'contact:\u00A0{categoryX}\npercent:\u00A0{label}';

        ChartUtil.getInstance().configureSeries(this.seriesDiscovery, ControlsConstants.COLOR____FONT, false);

        this.chart.cursor = new XYCursor();
        this.chart.cursor.xAxis = this.xAxis;
        this.chart.cursor.showTooltipOn = 'always';
        this.chart.cursor.exportable = true;
        this.chart.cursor.lineX.disabled = true;
        this.chart.cursor.lineY.disabled = true;

        this.valueTotalLabel = this.chart.createChild(Label);
        this.valueTotalLabel.fontFamily = ControlsConstants.FONT_FAMILY;
        this.valueTotalLabel.fontSize = ControlsConstants.FONT_SIZE - 1;
        this.valueTotalLabel.fill = color(ControlsConstants.COLOR____FONT);
        this.valueTotalLabel.text = '';
        this.valueTotalLabel.isMeasured = false;
        this.valueTotalLabel.x = 50;
        this.valueTotalLabel.y = 142;
        this.valueTotalLabel.horizontalCenter = 'right';

        this.chart.events.on('ready', e => {
            (this.seriesDiscovery.bulletsContainer.element.node.parentNode as SVGGElement).setAttributeNS(null, 'clip-path', '');
            setTimeout(() => {

            }, 100);
        });

    }

    async acceptModificationTime(modificationTime: ModificationTime): Promise<void> {

        // console.log('contactColumns', contactColumns);

        const demographics = Demographics.getInstance();
        const chartData: IChartDataDiscovery[] = [];
        const ageGroups = demographics.getAgeGroups();

        for (let indexContact = 0; indexContact < ageGroups.length; indexContact++) {
            const ratios = modificationTime.getDiscoveryRatios(indexContact);
            chartData.push({
                contactX: ageGroups[indexContact].getName(),
                contactRatio: ratios.contact,
                discoveryRatio: ratios.discovery,
                label: this.labellingDefinitionTooltip.format(ratios.discovery)
            });
        }

        const discoveryRatioTotal = modificationTime.getDiscoveryRateTotal(); // contactColumns.getColumnSum() / contactColumns.getMaxColumnSum();
        // console.log('discoveryRatioTotal', discoveryRatioTotal);
        // this.valueTotalLabel.text = (columnValue * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_1) + '%';
        this.valueTotalLabel.text = this.labellingDefinitionTooltip.format(discoveryRatioTotal); // ControlsConstants.LOCALE_FORMAT_FIXED (columnValue * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_1) + '%';

        if (this.fullDataUpdate) {
            this.chart.data = chartData;
            this.fullDataUpdate = false;
        } else {
            for (let i = 0; i < chartData.length; i++) {
                if (this.chart.data[i].discoveryRatio) {
                    this.chart.data[i].contactRatio = chartData[i].contactRatio;
                    this.chart.data[i].discoveryRatio = chartData[i].discoveryRatio;
                    this.chart.data[i].label = chartData[i].label;
                }
            }
        }
        this.chart.invalidateRawData();

        this.fullDataUpdate = false;

    }

}