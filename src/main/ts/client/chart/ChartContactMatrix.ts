import { CategoryAxis, ColumnSeries, LineSeries, ValueAxis, XYChart, XYCursor } from '@amcharts/amcharts4/charts';
import { color, create, Label, percent, useTheme } from '@amcharts/amcharts4/core';
import am4themes_animated from '@amcharts/amcharts4/themes/animated';
import am4themes_dark from '@amcharts/amcharts4/themes/dark';
import { Demographics } from '../../common/demographics/Demographics';
import { IContactMatrix } from '../../common/modification/IContactMatrix';
import { ControlsConstants } from './../gui/ControlsConstants';
import { ChartUtil } from './ChartUtil';
import { IconMatrixAxis } from './IconMatrixAxis';

export interface IChartData {
    categoryX?: string;
    categoryY?: string;
    indexX?: number;
    indexY?: number;
    ratio?: number;
    gamma?: number;
    plotX?: string;
    plotY?: number;
    // color?: string;
}

export type AXIS_DIRECTION = 'CONTACT_PARTICIPANT' | 'PARTICIPANT_CONTACT';

/**
 * contact-matrix chart
 *
 * @author h.fleischer
 * @since 16.05.2021
 */
export class ChartContactMatrix {

    private readonly chart: XYChart;
    private readonly xAxisHeat: CategoryAxis;
    private readonly yAxisHeat: CategoryAxis;
    private readonly seriesHeat: ColumnSeries;

    private readonly xAxisPlot: CategoryAxis;
    private readonly yAxisPlot: ValueAxis;
    private readonly seriesPlot: LineSeries;

    private fullDataUpdate: boolean;
    private axisDirection: AXIS_DIRECTION;
    private contactMatrix: IContactMatrix;
    private readonly valueTotalLabel: Label;

    private readonly showToggleAndPercentage: boolean;

    private axisIcon: IconMatrixAxis;

    constructor(container: string, showToggleAndPercentage: boolean) {

        useTheme(am4themes_dark);
        useTheme(am4themes_animated);

        this.fullDataUpdate = true;
        this.showToggleAndPercentage = showToggleAndPercentage;
        this.axisDirection = 'CONTACT_PARTICIPANT';

        this.chart = create(container, XYChart);
        this.chart.leftAxesContainer.layout = 'absolute';
        this.chart.bottomAxesContainer.layout = 'absolute';
        this.chart.zoomOutButton.disabled = true;
        ChartUtil.getInstance().configureChartPadding(this.chart);
        ChartUtil.getInstance().configureSeparators(this.chart);

        this.xAxisHeat = this.chart.xAxes.push(new CategoryAxis());
        this.yAxisHeat = this.chart.yAxes.push(new CategoryAxis());

        this.xAxisPlot = this.chart.xAxes.push(new CategoryAxis());
        this.yAxisPlot = this.chart.yAxes.push(new ValueAxis());

        this.xAxisHeat.dataFields.category = 'categoryX';
        this.yAxisHeat.dataFields.category = 'categoryY';

        /**
         * x-axis
         */
        this.xAxisHeat.renderer.grid.template.disabled = false;
        this.xAxisHeat.renderer.minGridDistance = 10;
        this.xAxisHeat.tooltip.disabled = true;
        this.xAxisHeat.renderer.labels.template.disabled = true;

        /**
         * y-axis
         */
        ChartUtil.getInstance().configureAxis(this.yAxisHeat, 'Participant');
        this.yAxisHeat.tooltip.disabled = true;

        /**
         * series
         */
        this.seriesHeat = this.chart.series.push(new ColumnSeries());
        this.seriesHeat.dataFields.categoryX = 'categoryX';
        this.seriesHeat.dataFields.categoryY = 'categoryY';
        this.seriesHeat.dataFields.value = 'gamma';
        this.seriesHeat.cursorTooltipEnabled = false; // be sure the contact chart tooltip is hidden from the cursor
        ChartUtil.getInstance().configureSeries(this.seriesHeat, ControlsConstants.COLOR____FONT, false);


        this.chart.cursor = new XYCursor();
        this.chart.cursor.xAxis = this.xAxisPlot;
        this.chart.cursor.showTooltipOn = 'always';
        this.chart.cursor.exportable = true;
        this.chart.cursor.lineX.disabled = true;
        this.chart.cursor.lineY.disabled = true;

        this.xAxisPlot.dataFields.category = 'plotX';

        /**
         * x-axis
         */
        ChartUtil.getInstance().configureAxis(this.xAxisPlot, 'Contact');
        this.xAxisPlot.renderer.labels.template.rotation = -90;
        this.xAxisPlot.renderer.labels.template.horizontalCenter = 'right';
        this.xAxisPlot.renderer.labels.template.verticalCenter = 'middle';
        this.xAxisPlot.tooltip.disabled = true;

        /**
         * y-axis
         */
        this.yAxisPlot.renderer.labels.template.disabled = true;
        this.yAxisPlot.renderer.grid.template.disabled = false;

        this.yAxisPlot.min = 0.00;
        // this.yAxisPlot.max = 25.0; // 0.15;
        // this.yAxisPlot.strictMinMax = true;

        this.yAxisPlot.renderer.minGridDistance = 10;
        this.yAxisPlot.tooltip.disabled = true;

        /**
         * configure plot series
         */
        this.seriesPlot = this.chart.series.push(new LineSeries());
        this.seriesPlot.xAxis = this.xAxisPlot;
        this.seriesPlot.yAxis = this.yAxisPlot;
        this.seriesPlot.fontFamily = ControlsConstants.FONT_FAMILY;
        this.seriesPlot.fontSize = ControlsConstants.FONT_SIZE;
        this.seriesPlot.dataFields.categoryX = 'plotX';
        this.seriesPlot.dataFields.valueY = 'plotY';
        this.seriesPlot.fillOpacity = 0;
        this.seriesPlot.strokeWidth = 3;
        // this.seriesPlot.stroke = color(ChartUtil.getInstance().toColor(1));
        this.seriesPlot.strokeLinecap = 'round';
        // this.seriesPlot.propertyFields.stroke = 'color';
        this.seriesPlot.strokeOpacity = 1.0;

        this.seriesPlot.tooltipText = '{categoryX}';
        ChartUtil.getInstance().configureSeries(this.seriesPlot, ControlsConstants.COLOR____FONT, false);
        this.seriesPlot.adapter.add('tooltipText', (value, target) => {
            const indexCurr = target.tooltipDataItem.index;
            if (indexCurr >= 0 && target.dataItems.values.length > indexCurr) {
                const chartData = target.dataItems.values[indexCurr]?.dataContext as IChartData;
                const rate = chartData.ratio.toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_2);
                if (this.axisDirection === 'CONTACT_PARTICIPANT') {
                    return `${ChartUtil.getInstance().formatContactLine('contact', chartData.plotX)}\n${ChartUtil.getInstance().formatContactLine('rate', rate)}`;
                } else {
                    return `${ChartUtil.getInstance().formatContactLine('participant', chartData.plotX)}\n${ChartUtil.getInstance().formatContactLine('rate', rate)}`;
                }
            }
        });

        const columnTemplate = this.seriesHeat.columns.template;
        columnTemplate.strokeWidth = 1;
        columnTemplate.strokeOpacity = 0.2;
        columnTemplate.strokeWidth = 0;
        columnTemplate.paddingTop = 0;
        columnTemplate.paddingRight = 0;
        columnTemplate.paddingBottom = 0;
        columnTemplate.paddingLeft = 0;
        columnTemplate.width = percent(98);
        columnTemplate.height = percent(98);
        columnTemplate.tooltipText = '{categoryX}';

        const ageGroups = Demographics.getInstance().getAgeGroups();
        columnTemplate.adapter.add('tooltipText', (value, target) => {
            if (target.dataItem?.dataContext) {
                const chartData = target.dataItem.dataContext as IChartData;
                const rate = chartData.ratio.toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_2);
                const total = (chartData.ratio * ageGroups[chartData.indexX].getAbsValue()).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FIXED);
                if (this.axisDirection === 'CONTACT_PARTICIPANT') {
                    return `${ChartUtil.getInstance().formatContactLine('contact', chartData.categoryX)}\n${ChartUtil.getInstance().formatContactLine('participant', chartData.categoryY)}\n${ChartUtil.getInstance().formatContactLine('rate', rate)}\n${ChartUtil.getInstance().formatContactLine('total', total)}`;
                } else {
                    return `${ChartUtil.getInstance().formatContactLine('participant', chartData.categoryX)}\n${ChartUtil.getInstance().formatContactLine('contact', chartData.categoryY)}\n${ChartUtil.getInstance().formatContactLine('rate', rate)}\n${ChartUtil.getInstance().formatContactLine('total', total)}`;
                }
            }
        });

        this.seriesHeat.heatRules.push({
            target: columnTemplate,
            property: 'fill',
            min: color(ChartUtil.getInstance().toColor(0, ControlsConstants.HEATMAP_______PLAIN)), // INCIDENCE refers to color only, no function meaning
            max: color(ChartUtil.getInstance().toColor(1, ControlsConstants.HEATMAP_______PLAIN)),
            minValue: 0.00,
            maxValue: 1.00,
        });

        this.valueTotalLabel = this.chart.createChild(Label);
        this.valueTotalLabel.fontFamily = ControlsConstants.FONT_FAMILY;
        this.valueTotalLabel.fontSize = ControlsConstants.FONT_SIZE - 1;
        this.valueTotalLabel.fill = color(ControlsConstants.COLOR____FONT);
        this.valueTotalLabel.text = '';
        this.valueTotalLabel.isMeasured = false;
        this.valueTotalLabel.x = 50;
        this.valueTotalLabel.y = 287;
        this.valueTotalLabel.horizontalCenter = 'right';
        this.valueTotalLabel.visible = this.showToggleAndPercentage;

        this.chart.leftAxesContainer.events.on('sizechanged', e => {

            this.yAxisHeat.y = 0;
            this.yAxisHeat.height = 192;
            this.yAxisPlot.y = 192;
            this.yAxisPlot.height = 65;

        });

        this.chart.events.on('ready', e => {
            (this.seriesHeat.bulletsContainer.element.node.parentNode as SVGGElement).setAttributeNS(null, 'clip-path', '');
            (this.seriesPlot.element.node.firstChild as SVGGElement).setAttributeNS(null, 'clip-path', '');
            setTimeout(() => {

                this.axisIcon = new IconMatrixAxis();
                document.getElementById(container).appendChild(this.axisIcon.getSvgContainer());
                this.axisIcon.getSvgContainer().addEventListener('pointerup', () => {
                    this.toggleAxes();
                });
                this.axisIcon.getSvgContainer().style.display = this.showToggleAndPercentage ? 'block' : 'none';

                this.toggleAxisContact();


            }, 100);
        });

    }

    toggleAxisContact(): void {
        this.axisDirection = 'CONTACT_PARTICIPANT';
        this.xAxisPlot.title.text = 'contact';
        this.yAxisHeat.title.text = 'participant';
        this.axisIcon.setAngle(0);
    }

    toggleAxisParticipant(): void {
        this.axisDirection = 'PARTICIPANT_CONTACT';
        this.xAxisPlot.title.text = 'participant';
        this.yAxisHeat.title.text = 'contact';
        this.axisIcon.setAngle(-90);
    }

    toggleAxes(): void {
        if (this.axisDirection === 'CONTACT_PARTICIPANT') {
            this.toggleAxisParticipant();
        } else {
            this.toggleAxisContact();
        }
        this.redraw(this.contactMatrix);
    }

    async redraw(contactMatrix: IContactMatrix): Promise<void> {

        this.contactMatrix = contactMatrix;

        const demographics = Demographics.getInstance();
        const chartData: IChartData[] = [];
        const plotData: IChartData[] = [];
        const ageGroups = demographics.getAgeGroups();

        const heatRule = this.seriesHeat.heatRules.getIndex(0) as any;
        heatRule.minValue = 0;
        heatRule.maxValue = 1;

        // const matrixContactTotal = demographics.getMatrixSum();
        const maxCellTotal = contactMatrix.getMaxCellTotal();

        let matrixSum = 0;
        for (let indexX = 0; indexX < ageGroups.length; indexX++) {
            let columnContactsCurr = 0;
            for (let indexY = 0; indexY < ageGroups.length; indexY++) {

                let ratio = this.axisDirection === 'CONTACT_PARTICIPANT' ? contactMatrix.getContacts(indexX, indexY) : contactMatrix.getContacts(indexY, indexX);
                const population = this.axisDirection === 'CONTACT_PARTICIPANT' ? ageGroups[indexX].getAbsValue() : ageGroups[indexY].getAbsValue();

                columnContactsCurr += ratio;
                matrixSum += ratio * population;

                ratio = Math.max(0.00000000001, ratio);
                chartData.push({
                    categoryX: ageGroups[indexX].getName(),
                    categoryY: ageGroups[indexY].getName(),
                    indexX,
                    indexY,
                    ratio,
                    gamma: Math.pow(ratio / maxCellTotal, 1 / 1.25), // apply some gamma for better value perception
                    // label: ratio.toLocaleString(undefined, ModelConstants.LOCALE_FORMAT_FLOAT_1) // ChartUtil.getInstance().formatPercentage(contacts)
                });

            }
            plotData.push({
                plotX: ageGroups[indexX].getName(),
                plotY: columnContactsCurr,
                // color: ChartUtil.getInstance().toColor(columnContactsCurr * 10 / matrixContactTotal),
                ratio: columnContactsCurr
            });

        }

        console.log('matrixSum', matrixSum);

        chartData.push(...plotData);

        matrixSum = matrixSum / demographics.getMatrixSum();
        this.valueTotalLabel.text = (matrixSum * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_1) + '%';

        if (this.fullDataUpdate) {
            this.chart.data = chartData;
            this.fullDataUpdate = false;
            this.chart.invalidateRawData();
        } else {
            for (let i = 0; i < chartData.length; i++) {
                for (const key of Object.keys(chartData[i])) {
                    this.chart.data[i][key] = chartData[i][key];
                }
            }
            this.chart.invalidateRawData();
        }

        // full update required after setting all values to 0 (maybe an amcharts bug)
        this.fullDataUpdate = matrixSum === 0;

    }

}