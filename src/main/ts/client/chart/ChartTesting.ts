import { CategoryAxis, LineSeries, ValueAxis, XYChart, XYCursor } from '@amcharts/amcharts4/charts';
import { color, create, Label, useTheme } from '@amcharts/amcharts4/core';
import am4themes_animated from '@amcharts/amcharts4/themes/animated';
import am4themes_dark from '@amcharts/amcharts4/themes/dark';
import { Demographics } from '../../common/demographics/Demographics';
import { ModificationTesting } from '../../common/modification/ModificationTesting';
import { ControlsConstants } from '../gui/ControlsConstants';
import { ChartUtil } from './ChartUtil';

export interface IChartDataHeat {
    contactX: string;
    participantY: number;
    label: string;
}

/**
 * chart indicating the testing / discovery rate for different age groups
 *
 * @author h.fleischer
 * @since 16.05.2021
 */
export class ChartTesting {

    private readonly chart: XYChart;
    private readonly xAxis: CategoryAxis;
    private readonly yAxis: ValueAxis;
    private readonly seriesHeat: LineSeries;
    private readonly valueTotalLabel: Label;

    private fullDataUpdate: boolean;

    constructor(container: string) {

        useTheme(am4themes_dark);
        useTheme(am4themes_animated);

        this.fullDataUpdate = true;

        this.chart = create(container, XYChart);
        this.chart.zoomOutButton.disabled = true;
        ChartUtil.getInstance().configureChartPadding(this.chart);
        ChartUtil.getInstance().configureSeparators(this.chart);

        this.xAxis = this.chart.xAxes.push(new CategoryAxis());
        this.yAxis = this.chart.yAxes.push(new ValueAxis());

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
         ChartUtil.getInstance().configureAxis(this.yAxis, 'cases discovered');
        this.yAxis.tooltip.disabled = true;
        this.yAxis.renderer.labels.template.adapter.add('text', (value, target) => {
            return ChartUtil.getInstance().formatLabelOrTooltipValue(value);
            // return (parseFloat(value) * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FIXED) + '%'
        });

        this.yAxis.min = 0.00;
        this.yAxis.max = 1.01;
        this.yAxis.strictMinMax = true;

        this.seriesHeat = this.chart.series.push(new LineSeries());
        this.seriesHeat.xAxis = this.xAxis;
        this.seriesHeat.yAxis = this.yAxis;
        this.seriesHeat.fontFamily = ControlsConstants.FONT_FAMILY;
        this.seriesHeat.fontSize = ControlsConstants.FONT_SIZE;
        this.seriesHeat.dataFields.categoryX = 'contactX';
        this.seriesHeat.dataFields.valueY = 'participantY';
        this.seriesHeat.fillOpacity = 0;
        this.seriesHeat.strokeWidth = 3;
        // this.seriesHeat.stroke = color(ControlsConstants.COLOR____FONT);
        this.seriesHeat.strokeLinecap = 'round';
        // this.seriesHeat.propertyFields.stroke = 'color';
        this.seriesHeat.strokeOpacity = 1.0;
        this.seriesHeat.tooltip.disabled = false;
        this.seriesHeat.tooltipText = 'contact:\u00A0{categoryX}\npercent:\u00A0{label}';

        ChartUtil.getInstance().configureSeries(this.seriesHeat, ControlsConstants.COLOR____FONT, false);

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
            (this.seriesHeat.bulletsContainer.element.node.parentNode as SVGGElement).setAttributeNS(null, 'clip-path', '');
            setTimeout(() => {

            }, 100);
        });

    }

    /**
     * TODO color range should probably not be 0-1, but a calculated value from reduction in post positive test compartments
     * @param modification
     */
    async redraw(modification: ModificationTesting): Promise<void> {

        const demographics = Demographics.getInstance();
        const chartData = [];
        const ageGroups = demographics.getAgeGroups();

        for (let indexContact = 0; indexContact < ageGroups.length; indexContact++) {
            const testingVal = modification.getTestingRatio(indexContact);
            chartData.push({
                contactX: ageGroups[indexContact].getName(),
                participantY: Math.max(0.00000000001, testingVal),
                label: (testingVal * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_2) + '%',
                color: ChartUtil.getInstance().toColor(testingVal)
            });
        }

        this.valueTotalLabel.text = (modification.getTestingRatioTotal() * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_1) + '%';

        if (this.fullDataUpdate) {
            this.chart.data = chartData;
            this.fullDataUpdate = false;
            this.chart.invalidateRawData();
        } else {
            for (let i = 0; i < chartData.length; i++) {
                if (this.chart.data[i].participantY) {
                    this.chart.data[i].participantY = chartData[i].participantY;
                    this.chart.data[i].label = chartData[i].label;
                    // this.chart.data[i].color = chartData[i].color;
                }
            }
            this.chart.invalidateRawData();
        }

        this.fullDataUpdate = false;

    }

}