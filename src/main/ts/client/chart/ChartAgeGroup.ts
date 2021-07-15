import { CategoryAxis, Column, ColumnSeries, Legend, ValueAxis, XYChart, XYCursor } from "@amcharts/amcharts4/charts";
import { color, create, percent, Rectangle, useTheme } from "@amcharts/amcharts4/core";
import am4themes_animated from '@amcharts/amcharts4/themes/animated';
import am4themes_dark from '@amcharts/amcharts4/themes/dark';
import { Demographics } from '../../common/demographics/Demographics';
import { IModificationValuesStrain } from '../../common/modification/IModificationValuesStrain';
import { Modifications } from '../../common/modification/Modifications';
import { BaseData } from '../../model/calibration/BaseData';
import { Color } from '../../util/Color';
import { TimeUtil } from '../../util/TimeUtil';
import { CHART_MODE______KEY, ControlsConstants, IControlsChartDefinition } from '../gui/ControlsConstants';
import { SliderModification } from '../gui/SliderModification';
import { StorageUtil } from '../storage/StorageUtil';
import { AgeGroup } from './../../common/demographics/AgeGroup';
import { ModelConstants } from './../../model/ModelConstants';
import { IDataItem } from './../../model/state/ModelStateIntegrator';
import { ColorUtil } from './../../util/ColorUtil';
import { ICoordinate } from './../../util/ICoordinate';
import { ObjectUtil } from './../../util/ObjectUtil';
import { ControlsVaccination } from './../controls/ControlsVaccination';
import { ModelActions } from './../gui/ModelActions';
import { ChartAgeGroupSeries } from './ChartAgeGroupSeries';
import { ChartUtil } from './ChartUtil';

export interface IModificationData {
    modValueY: number,
    categoryX: string
}

/**
 * central chart of the application
 *
 * @author h.fleischer
 * @since 16.05.2021
 */
export class ChartAgeGroup {

    static readonly showDiffDisplay = false;

    static readonly FIELD______INDEX = 'index';
    static readonly FIELD_CATEGORY_X = 'categoryX';
    static readonly FIELD_CATEGORY_Y = 'categoryY';

    static getInstance(): ChartAgeGroup {
        if (ObjectUtil.isEmpty(this.instance)) {
            this.instance = new ChartAgeGroup();
        }
        return this.instance;
    }
    private static instance: ChartAgeGroup;

    protected readonly chart: XYChart;

    protected readonly xAxis: CategoryAxis;

    protected readonly yAxisPlotAbsolute: ValueAxis;
    protected readonly yAxisPlotRelative: ValueAxis;
    protected readonly yAxisPlotIncidence: ValueAxis;
    protected readonly columnTemplate: Column;

    protected readonly yAxisHeat: CategoryAxis;
    protected readonly yAxisModification: ValueAxis;
    private seriesAgeGroupLabelLocation: number;

    /**
     * primary incidence series (all strains)
     */
    protected readonly seriesAgeGroupIncidence: ChartAgeGroupSeries;

    /**
     * incidence series by strain
     */
    protected readonly seriesAgeGroupIncidenceByStrain: Map<string, ChartAgeGroupSeries>;

    protected readonly seriesAgeGroupCases: ChartAgeGroupSeries;

    protected readonly seriesAgeGroupSusceptible: ChartAgeGroupSeries;

    /**
     * primary exposed series (all strains)
     */
    protected readonly seriesAgeGroupExposed: ChartAgeGroupSeries;

    /**
     * primary infectious series (all strains)
     */
    protected readonly seriesAgeGroupInfectious: ChartAgeGroupSeries;

    protected readonly seriesAgeGroupRemovedID: ChartAgeGroupSeries;
    protected readonly seriesAgeGroupRemovedIU: ChartAgeGroupSeries;

    /**
     * modelled vaccination data
     */
    protected readonly seriesAgeGroupRemovedVMI: ChartAgeGroupSeries;
    protected readonly seriesAgeGroupRemovedVMV: ChartAgeGroupSeries;
    protected readonly seriesAgeGroupRemovedVMU: ChartAgeGroupSeries;

    /**
     * real data
     */
    protected readonly seriesAgeGroupRemovedVR1: ChartAgeGroupSeries;
    protected readonly seriesAgeGroupRemovedVR2: ChartAgeGroupSeries;
    protected readonly seriesAgeGroupRemovedVRC: ChartAgeGroupSeries; // control curve (maybe possible to replace with stacked curves)
    protected readonly seriesAgeGroupIncidenceR: ChartAgeGroupSeries; // real incidence

    protected readonly seriesModification: ChartAgeGroupSeries;

    protected readonly seriesHeat: ColumnSeries;

    private maxInfectious: number;
    private absValue: number; // the absolute value of the age-group currently displayed
    private ageGroupIndex: number;
    private modelData: IDataItem[];
    private ageGroupsWithTotal: AgeGroup[];
    private chartMode: CHART_MODE______KEY;

    private ageGroupMarker: Rectangle;
    private intervalHandle: number;

    private constructor() {

        useTheme(am4themes_dark);
        useTheme(am4themes_animated);

        this.absValue = 0;
        this.ageGroupIndex = 10;
        this.chartMode = 'INCIDENCE';

        this.chart = create('chartDivAgeGroupPlot', XYChart);

        ChartUtil.getInstance().configureLegend(this.chart);
        ChartUtil.getInstance().configureChartPadding(this.chart);
        ChartUtil.getInstance().configureSeparators(this.chart);

        // this.chart.plotContainer.adapter.add('x', (x, target) => {
        //     // if (this.xAxis.dataItems.length > 0) {
        //     //     // const categoryMin = this.xAxis.positionToCategory(this.xAxis.start);
        //     //     // const categoryMax = this.xAxis.positionToCategory(this.xAxis.end);
        //     //     // // const categoryMin = TimeUtil.formatCategoryDate(SliderModification.getInstance().getMinValue());
        //     //     // const positionMin = this.xAxis.categoryToPoint(categoryMin);
        //     //     // // const categoryMax = TimeUtil.formatCategoryDate(SliderModification.getInstance().getMaxValue());
        //     //     // const positionMax = this.xAxis.categoryToPoint(categoryMax);
        //     //     // console.log('slider padding');
        //     //     // SliderModification.getInstance().setSliderPadding((x as number) + positionMin.x + 4, this.chart.plotContainer.pixelWidth - positionMax.x + 20);
        //     // }
        //     return x;
        // });

        let plotContainerOutTimeout = -1;
        this.chart.plotContainer.events.on('out', () => {
            clearTimeout(plotContainerOutTimeout);
            plotContainerOutTimeout = window.setTimeout(() => {
                const timeInstant = Modifications.getInstance().findModificationsByType('TIME')[0].getInstantA();
                this.setInstant(timeInstant);
            }, 100);
        });
        this.chart.plotContainer.events.on('over', () => {
            clearTimeout(plotContainerOutTimeout);
        });

        this.chart.leftAxesContainer.layout = 'absolute';
        this.chart.bottomAxesContainer.layout = 'absolute';

        this.xAxis = this.chart.xAxes.push(new CategoryAxis());
        this.xAxis.dataFields.category = ChartAgeGroup.FIELD_CATEGORY_X;
        ChartUtil.getInstance().configureAxis(this.xAxis, 'Date');
        this.xAxis.renderer.labels.template.rotation = -90;
        this.xAxis.renderer.labels.template.horizontalCenter = 'right';
        this.xAxis.renderer.labels.template.verticalCenter = 'middle';
        this.xAxis.rangeChangeDuration = 0;

        this.xAxis.tooltip.label.rotation = -90;
        this.xAxis.tooltip.label.horizontalCenter = 'right';
        this.xAxis.tooltip.label.verticalCenter = 'middle';

        this.yAxisPlotAbsolute = this.chart.yAxes.push(new ValueAxis());
        ChartUtil.getInstance().configureAxis(this.yAxisPlotAbsolute, 'population');
        this.yAxisPlotAbsolute.tooltip.exportable = false;
        this.yAxisPlotAbsolute.rangeChangeDuration = 0;
        this.yAxisPlotAbsolute.strictMinMax = true;
        this.yAxisPlotAbsolute.visible = false;
        this.yAxisPlotAbsolute.renderer.grid.template.disabled = true;
        this.yAxisPlotAbsolute.tooltip.disabled = true;

        this.yAxisPlotRelative = this.chart.yAxes.push(new ValueAxis());
        ChartUtil.getInstance().configureAxis(this.yAxisPlotRelative, 'Population %');
        this.yAxisPlotRelative.tooltip.exportable = false;
        this.yAxisPlotRelative.visible = false;
        this.yAxisPlotRelative.renderer.grid.template.disabled = true;
        this.yAxisPlotRelative.rangeChangeDuration = 0;
        this.yAxisPlotRelative.strictMinMax = true;
        this.yAxisPlotRelative.min = 0.00;
        this.yAxisPlotRelative.max = 1.01; // some extra required, or 100% label will not show

        this.yAxisPlotRelative.renderer.labels.template.adapter.add('text', (value, target) => {
            return ChartUtil.getInstance().formatLabelOrTooltipValue(value, this.yAxisPlotRelative.max >= 1 ? ControlsConstants.LABEL_PERCENT___FIXED : ControlsConstants.LABEL_PERCENT__FLOAT_2);
        });
        this.yAxisPlotRelative.tooltip.label.adapter.add('text', (value, target) => {
            return ChartUtil.getInstance().formatLabelOrTooltipValue(value, this.yAxisPlotRelative.max >= 1 ? ControlsConstants.LABEL_PERCENT___FIXED : ControlsConstants.LABEL_PERCENT__FLOAT_2);
        });

        // incidence axis
        this.yAxisPlotIncidence = this.chart.yAxes.push(new ValueAxis());
        this.yAxisPlotIncidence.rangeChangeDuration = 0;
        this.yAxisPlotIncidence.strictMinMax = true;
        ChartUtil.getInstance().configureAxis(this.yAxisPlotIncidence, '7-day incidence / ' + (100000).toLocaleString());
        this.yAxisPlotIncidence.tooltip.exportable = false;

        // modification indicator axis
        this.yAxisModification = this.chart.yAxes.push(new ValueAxis());
        this.yAxisModification.strictMinMax = true;
        this.yAxisModification.rangeChangeDuration = 0;
        this.yAxisModification.zoomable = false;
        ChartUtil.getInstance().configureAxis(this.yAxisModification, 'Mods');
        // this.yAxisModification.tooltip.exportable = false;
        this.yAxisModification.renderer.labels.template.adapter.add('text', (value) => {
            return ChartUtil.getInstance().formatLabelOrTooltipValue(value, this.seriesModification.getLabellingDefinition());
        });
        this.yAxisModification.tooltip.label.adapter.add('text', (value, target) => {
            return ChartUtil.getInstance().formatLabelOrTooltipValue(value, this.seriesModification.getLabellingDefinition());
        });

        this.seriesAgeGroupCases = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotAbsolute,
            title: 'cases',
            baseLabel: 'cases',
            valueField: 'ageGroupCases',
            colorKey: 'CASES',
            strokeWidth: 2,
            dashed: false,
            locationOnPath: 0.30,
            labelled: true,
            percent: false,
            stacked: false,
            legend: true
        });

        this.seriesAgeGroupLabelLocation = 0.5;
        this.seriesAgeGroupIncidence = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotIncidence,
            title: 'incidence',
            baseLabel: 'incidence',
            valueField: 'ageGroupIncidence',
            colorKey: 'INCIDENCE',
            strokeWidth: 2,
            dashed: false,
            locationOnPath: 0.10,
            labelled: true,
            percent: false,
            stacked: false,
            legend: true
        });
        this.seriesAgeGroupIncidenceR = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotIncidence,
            title: 'incidence',
            baseLabel: 'incidence',
            valueField: 'ageGroupIncidenceR',
            colorKey: 'SEASONALITY',
            strokeWidth: 1,
            dashed: true,
            locationOnPath: 0.35,
            labelled: false,
            percent: false,
            stacked: false,
            legend: false
        });
        this.seriesAgeGroupIncidenceByStrain = new Map();

        this.seriesAgeGroupRemovedVMV = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotRelative,
            title: 'vaccinated',
            baseLabel: 'vaccinated, full',
            valueField: 'ageGroupRemovedVM2',
            colorKey: 'VACCINATION',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.15,
            labelled: false,
            percent: true,
            stacked: true,
            legend: true
        });

        this.seriesAgeGroupRemovedVMI = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotRelative,
            title: 'immunizing',
            baseLabel: 'immunizing',
            valueField: 'ageGroupRemovedVM1',
            colorKey: 'SUSCEPTIBLE',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.05,
            labelled: false,
            percent: true,
            stacked: true,
            legend: false
        });

        this.seriesAgeGroupRemovedVMU = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotRelative,
            title: 'vaccinated, after asymptomatic infection',
            baseLabel: 'vaccinated, after asymptomatic infection',
            valueField: 'ageGroupRemovedVMU',
            colorKey: 'REMOVED',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.25,
            labelled: false,
            percent: true,
            stacked: true,
            legend: false
        });

        /**
         * recovered after known infection
         */
        this.seriesAgeGroupRemovedID = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotRelative,
            title: 'recovered',
            baseLabel: 'recovered after symptomatic infection',
            valueField: 'ageGroupRemovedID',
            colorKey: 'REMOVED',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.15,
            labelled: false,
            percent: true,
            stacked: true,
            legend: true
        });

        /**
         * recovered after asymptomatic infection
         */
        this.seriesAgeGroupRemovedIU = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotRelative,
            title: 'recovered',
            baseLabel: 'recovered after asymptomatic infection',
            valueField: 'ageGroupRemovedIU',
            colorKey: 'REMOVED',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.25,
            labelled: false,
            percent: true,
            stacked: true,
            legend: false
        });
        this.seriesAgeGroupRemovedID.bindToLegend(this.seriesAgeGroupRemovedIU);
        this.seriesAgeGroupRemovedID.bindToLegend(this.seriesAgeGroupRemovedVMU);

        this.seriesAgeGroupSusceptible = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotRelative,
            title: 'susceptible',
            baseLabel: 'susceptible',
            valueField: 'ageGroupSusceptible',
            colorKey: 'SUSCEPTIBLE',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.05,
            labelled: false,
            percent: true,
            stacked: true,
            legend: true
        });
        this.seriesAgeGroupSusceptible.bindToLegend(this.seriesAgeGroupRemovedVMI);

        this.seriesAgeGroupExposed = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotRelative,
            title: 'exposed',
            baseLabel: 'exposed',
            valueField: 'ageGroupExposed',
            colorKey: 'EXPOSED',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.25,
            labelled: false,
            percent: true,
            stacked: true,
            legend: true
        });
        this.seriesAgeGroupInfectious = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotRelative,
            title: 'infectious',
            baseLabel: 'infectious',
            valueField: 'ageGroupInfectious',
            colorKey: 'INFECTIOUS',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.45,
            labelled: false,
            percent: true,
            stacked: true,
            legend: true
        });

        /**
         * vaccinated (first)
         */
        this.seriesAgeGroupRemovedVR1 = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotRelative,
            title: 'vaccinated',
            baseLabel: 'vaccinated, partial',
            valueField: 'ageGroupRemovedVR1',
            colorKey: 'SEASONALITY',
            strokeWidth: 1,
            dashed: true,
            locationOnPath: 0.25,
            labelled: false,
            percent: true,
            stacked: false,
            legend: true
        });

        /**
         * vaccinated (complete)
         */
        this.seriesAgeGroupRemovedVR2 = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotRelative,
            title: 'vaccinated',
            baseLabel: 'vaccinated, full',
            valueField: 'ageGroupRemovedVR2',
            colorKey: 'SEASONALITY',
            strokeWidth: 1,
            dashed: true,
            locationOnPath: 0.35,
            labelled: false,
            percent: true,
            stacked: false,
            legend: false
        });
        this.seriesAgeGroupRemovedVR1.bindToLegend(this.seriesAgeGroupRemovedVR2);

        /**
         * vaccinated (control curve)
         */
        this.seriesAgeGroupRemovedVRC = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotRelative,
            title: 'vaccinated',
            baseLabel: 'vaccinated, full',
            valueField: 'ageGroupRemovedVRC',
            colorKey: 'INFECTIOUS',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.45,
            labelled: false,
            percent: true,
            stacked: false,
            legend: false
        });

        this.seriesModification = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisModification,
            title: 'mod',
            baseLabel: '',
            valueField: 'modValueY',
            colorKey: 'TIME',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.70,
            labelled: true,
            percent: true,
            stacked: false,
            legend: false
        });

        this.chart.cursor = new XYCursor();
        this.chart.cursor.xAxis = this.xAxis;
        this.chart.cursor.showTooltipOn = 'always';
        this.chart.cursor.exportable = true;
        this.chart.cursor.events.on('cursorpositionchanged', e => {
            // this.chart.cursor.triggerMove(e.target.point, 'soft');
        });
        this.chart.cursor.lineX.disabled = false;
        this.chart.cursor.lineY.disabled = true;

        this.chart.zoomOutButton.disabled = false;
        this.chart.cursor.behavior = 'zoomX';
        this.chart.mouseWheelBehavior = 'zoomX';

        /**
         * heat axis
         */
        this.yAxisHeat = this.chart.yAxes.push(new CategoryAxis());
        this.yAxisHeat.dataFields.category = ChartAgeGroup.FIELD_CATEGORY_Y;
        this.yAxisHeat.zoomable = false;
        ChartUtil.getInstance().configureAxis(this.yAxisHeat, 'Age');

        /**
         * configure heat series
         */
        this.seriesHeat = this.chart.series.push(new ColumnSeries());
        this.seriesHeat.xAxis = this.xAxis;
        this.seriesHeat.yAxis = this.yAxisHeat;
        this.seriesHeat.dataFields.categoryX = ChartAgeGroup.FIELD_CATEGORY_X;
        this.seriesHeat.dataFields.categoryY = ChartAgeGroup.FIELD_CATEGORY_Y;
        this.seriesHeat.dataFields.value = 'value';
        this.seriesHeat.interpolationDuration = 0;
        this.seriesHeat.tooltip.disabled = false;
        this.seriesHeat.cursorTooltipEnabled = false; // be sure the contact chart tooltip is hidden from the cursor
        this.seriesHeat.hiddenInLegend = true;
        ChartUtil.getInstance().configureSeries(this.seriesHeat, ControlsConstants.COLOR____FONT, false);
        this.seriesHeat.events.on("ready", () => {
            // TODO implement or remove
        });

        this.ageGroupMarker = this.chart.plotContainer.createChild(Rectangle);
        this.ageGroupMarker.strokeWidth = 0;
        this.ageGroupMarker.fillOpacity = 1;
        this.ageGroupMarker.fill = color(ControlsConstants.COLOR____FONT);
        this.ageGroupMarker.zIndex = 100;

        this.columnTemplate = this.seriesHeat.columns.template;
        this.columnTemplate.strokeWidth = 0;
        this.columnTemplate.tooltipText = `{${ChartAgeGroup.FIELD_CATEGORY_X}}, {${ChartAgeGroup.FIELD_CATEGORY_Y}}: {label}`;
        this.columnTemplate.width = percent(95);
        this.columnTemplate.height = percent(95);
        this.columnTemplate.events.on('hit', e => {
            const index = e.target.dataItem.dataContext[ChartAgeGroup.FIELD______INDEX];
            // this.setSeriesAgeGroup(index);
            ModelActions.getInstance().toggleAgeGroup(index);
        });
        if (ChartAgeGroup.showDiffDisplay) {
            this.columnTemplate.propertyFields.fill = 'color';
        }

        this.seriesHeat.heatRules.push({
            target: this.columnTemplate,
            property: 'fill',
            min: color(ChartUtil.getInstance().toColor(0, ControlsConstants.HEATMAP_DATA_PARAMS[this.chartMode])),
            max: color(ChartUtil.getInstance().toColor(1, ControlsConstants.HEATMAP_DATA_PARAMS[this.chartMode])),
            minValue: 0,
            maxValue: 1,
        });

        this.xAxis.events.on('startendchanged', e => {

            // console.log('startendchanged')

            const minCategory = this.xAxis.positionToCategory(this.xAxis.start);
            const maxCategory = this.xAxis.positionToCategory(this.xAxis.end);
            const minInstant = this.findDataItemByCategory(minCategory).instant;
            const maxInstant = this.findDataItemByCategory(maxCategory).instant;

            const ticks = SliderModification.getInstance().getTickValues().filter(t => t > minInstant && t < maxInstant);

            SliderModification.getInstance().setRange([minInstant, ...ticks, maxInstant]);
            this.applyMaxIncidence();

        });

        // zoom in y-direction
        // this.valueAxisAbsolute.adapter.add('start', (value, target) => {
        //     if (this.yMin >= 0) {
        //         value = (this.yMin - this.valueAxisAbsolute.min) / (this.valueAxisAbsolute.max - this.valueAxisAbsolute.min);
        //     }
        //     this.valueAxisIncidence.start = value;
        //     return value;
        // });
        // this.valueAxisAbsolute.adapter.add('end', (value, target) => {
        //     if (this.yMax >= 0) {
        //         value = (this.yMax - this.valueAxisAbsolute.min) / (this.valueAxisAbsolute.max - this.valueAxisAbsolute.min);
        //     }
        //     this.valueAxisIncidence.end = value;
        //     return value;
        // });

        this.yAxisPlotIncidence.adapter.add('min', (value, target) => {
            this.yAxisPlotAbsolute.min = value * this.absValue / 700000;
            return value;
        });
        this.yAxisPlotIncidence.adapter.add('max', (value, target) => {
            this.yAxisPlotAbsolute.max = value * this.absValue / 700000;
            return value;
        });


        // disables flickering thin border line
        this.chart.leftAxesContainer.strokeWidth = 2;
        this.chart.leftAxesContainer.events.on('sizechanged', e => {

            const pp = 100 / this.chart.leftAxesContainer.pixelHeight;

            // space between sub-charts
            const pixelMargin = 10;

            const pixelHeightHeat = 140;
            const pixelHeightModification = 30;

            const pixelHeightPlot = this.chart.leftAxesContainer.pixelHeight - pixelHeightHeat - pixelHeightModification - pixelMargin * 2;

            const pixelPosModification = 0;
            const pixelPosPlot = pixelPosModification + pixelHeightModification + pixelMargin;
            const pixelPosHeat = pixelPosPlot + pixelHeightPlot + pixelMargin;

            this.yAxisPlotAbsolute.y = percent(pixelPosPlot * pp);
            this.yAxisPlotRelative.y = percent(pixelPosPlot * pp);
            this.yAxisPlotIncidence.y = percent(pixelPosPlot * pp);
            this.yAxisHeat.y = percent(pixelPosHeat * pp);
            this.yAxisModification.y = percent(pixelPosModification * pp);

            this.yAxisModification.height = percent(pixelHeightModification * pp);

            this.yAxisPlotAbsolute.height = percent(pixelHeightPlot * pp);
            this.yAxisPlotRelative.height = percent(pixelHeightPlot * pp);
            this.yAxisPlotIncidence.height = percent(pixelHeightPlot * pp);

            this.yAxisHeat.height = percent(pixelHeightHeat * pp);;

        });

        // disables flickering thin border line
        this.chart.bottomAxesContainer.strokeWidth = 0;
        this.chart.bottomAxesContainer.events.on('sizechanged', e => {
            this.xAxis.x = 0;
            this.xAxis.width = percent(100);
        });

        this.chart.events.on('ready', e => {
            // (this.seriesHeat.bulletsContainer.element.node.parentNode as SVGGElement).setAttributeNS(null, 'clip-path', '');
        });

        this.chart.exporting.adapter.add('filePrefix', (value, target) => {
            return {
                filePrefix: ObjectUtil.createDownloadName()
            };
        });

        // this.setChartMode('INCIDENCE');

    }

    getAgeGroupName(): string {
        if (this.ageGroupsWithTotal) {
            return this.ageGroupsWithTotal[this.ageGroupIndex].getName();
        } else {
            return ModelConstants.AGEGROUP_NAME_______ALL;
        }
    }

    getAgeGroupIndex(): number {
        return this.ageGroupIndex <= 9 ? this.ageGroupIndex : -1;
    }

    setInstant(instant: number): void {
        const point = this.xAxis.anyToPoint(TimeUtil.formatCategoryDate(instant));
        this.chart.cursor.triggerMove(point, 'soft'); // https://www.amcharts.com/docs/v4/tutorials/sticky-chart-cursor/
    }

    exportToPng(): void {
        this.chart.exporting.export("png");
    }

    exportToJson(): void {
        StorageUtil.getInstance().exportJson(this.modelData);
    }

    async setSeriesAgeGroup(ageGroupIndex: number): Promise<void> {

        if (ObjectUtil.isNotEmpty(this.modelData)) {

            this.ageGroupIndex = ageGroupIndex;
            const ageGroup = this.ageGroupsWithTotal[this.ageGroupIndex];
            this.absValue = ageGroup.getAbsValue();

            this.requestRenderModelData();

            // wait for the series heat to be ready, then place marker
            clearInterval(this.intervalHandle);
            this.intervalHandle = window.setInterval(() => {
                if (this.seriesHeat.columns.length > 0) {

                    const templateColumn = this.seriesHeat.columns.getIndex(0);

                    const minX = this.xAxis.categoryToPoint(TimeUtil.formatCategoryDate(SliderModification.getInstance().getMinValue())).x - templateColumn.realWidth / 2;
                    const maxX = this.xAxis.categoryToPoint(TimeUtil.formatCategoryDate(SliderModification.getInstance().getMinValue())).x + templateColumn.realWidth / 2;

                    const minY = this.yAxisHeat.categoryToPoint(this.ageGroupsWithTotal[ageGroupIndex].getName()).y - templateColumn.realHeight / 2;
                    const maxY = minY + templateColumn.realHeight;

                    // place the marker rectangle
                    this.ageGroupMarker.x = minX - 4;
                    this.ageGroupMarker.y = this.yAxisHeat.pixelY + maxY;
                    this.ageGroupMarker.width = 2;
                    this.ageGroupMarker.height = minY - maxY;

                    clearInterval(this.intervalHandle);

                }
            }, 100);

            this.seriesAgeGroupIncidence.setSeriesNote(ageGroup.getName());
            this.seriesAgeGroupIncidenceR.setSeriesNote(ageGroup.getName());
            this.seriesAgeGroupCases.setSeriesNote(ageGroup.getName());

            this.seriesAgeGroupSusceptible.setSeriesNote(ageGroup.getName());
            this.seriesAgeGroupExposed.setSeriesNote(ageGroup.getName());
            this.seriesAgeGroupInfectious.setSeriesNote(ageGroup.getName());
            this.seriesAgeGroupRemovedID.setSeriesNote(ageGroup.getName());
            this.seriesAgeGroupRemovedIU.setSeriesNote(ageGroup.getName());
            this.seriesAgeGroupRemovedVMI.setSeriesNote(ageGroup.getName());
            this.seriesAgeGroupRemovedVMV.setSeriesNote(ageGroup.getName());
            this.seriesAgeGroupRemovedVMU.setSeriesNote(ageGroup.getName());
            this.seriesAgeGroupRemovedVR1.setSeriesNote(ageGroup.getName());
            this.seriesAgeGroupRemovedVR2.setSeriesNote(ageGroup.getName());
            this.seriesAgeGroupRemovedVRC.setSeriesNote(ageGroup.getName());

            const modificationValuesStrain = Modifications.getInstance().findModificationsByType('STRAIN').map(m => m.getModificationValues() as IModificationValuesStrain);
            modificationValuesStrain.forEach(strainValues => {
                // this call implicitly updates the base label, explicity updates series label
                this.getOrCreateSeriesAgeGroupIncidenceStrain(strainValues).setSeriesNote(ageGroup.getName());
            });

            if (ModelActions.getInstance().getKey() === 'VACCINATION' && ageGroup.getName() !== ModelConstants.AGEGROUP_NAME_______ALL) {
                ControlsVaccination.getInstance().showVaccinationCurve(ageGroup.getName());
            } else {
                ControlsVaccination.getInstance().hideVaccinationCurve();
            }

        }

    }

    toVaccinationCoordinate(documentCoordinate: ICoordinate): ICoordinate {

        const containerBounds = document.getElementById('chartDivAgeGroupPlot').getBoundingClientRect();

        const offsetX = containerBounds.left + this.chart.pixelPaddingLeft + this.chart.plotContainer.pixelX + this.xAxis.pixelX;
        const offsetY = containerBounds.top + this.chart.pixelPaddingTop + this.chart.plotContainer.pixelY + this.yAxisPlotRelative.pixelY;

        const offsetCoordinate = {
            x: documentCoordinate.x - offsetX,
            y: documentCoordinate.y - offsetY
        }

        const positionX = this.xAxis.pointToPosition(offsetCoordinate);
        const categoryX = this.xAxis.positionToCategory(positionX);
        const valueX = this.findDataItemByCategory(categoryX).instant;

        const positionY =  this.yAxisPlotRelative.pointToPosition(offsetCoordinate);
        const valueY = this.yAxisPlotRelative.positionToValue(positionY);

        return {
            x: valueX,
            y: valueY
        }

    }

    toDocumentCoordinate(vaccinationCoordinate: ICoordinate): ICoordinate {

        const categoryX = TimeUtil.formatCategoryDate(vaccinationCoordinate.x);
        const containerBounds = document.getElementById('chartDivAgeGroupPlot').getBoundingClientRect();
        return {
            x: containerBounds.left + this.chart.pixelPaddingLeft + this.chart.plotContainer.pixelX + this.xAxis.pixelX + this.xAxis.categoryToPoint(categoryX).x,
            y: containerBounds.top + this.chart.pixelPaddingTop + this.chart.plotContainer.pixelY + this.yAxisPlotRelative.pixelY + this.yAxisPlotRelative.valueToPoint(vaccinationCoordinate.y).y
        }

    }

    getOrCreateSeriesAgeGroupIncidenceStrain(strainValues: IModificationValuesStrain): ChartAgeGroupSeries {

        if (!this.seriesAgeGroupIncidenceByStrain.has(strainValues.id)) {
            this.seriesAgeGroupIncidenceByStrain.set(strainValues.id, new ChartAgeGroupSeries({
                chart: this.chart,
                yAxis: this.yAxisPlotIncidence,
                title: 'incidence',
                baseLabel: strainValues.name,
                valueField: `ageGroupIncidence${strainValues.id}`,
                colorKey: 'INCIDENCE',
                strokeWidth: 1,
                dashed: true,
                locationOnPath: this.seriesAgeGroupLabelLocation,
                labelled: true,
                percent: false,
                stacked: false,
                legend: false
            }));
            this.seriesAgeGroupLabelLocation += 0.1;
            if (this.seriesAgeGroupLabelLocation > 0.8) {
                this.seriesAgeGroupLabelLocation = 0.5;
            }
        }

        const seriesAgeGroup = this.seriesAgeGroupIncidenceByStrain.get(strainValues.id);
        seriesAgeGroup.setBaseLabel(strainValues.name);
        seriesAgeGroup.setVisible(this.chartMode === 'INCIDENCE');
        return seriesAgeGroup;

    }

    setSeriesSRVisible(visible: boolean): void {

        this.yAxisPlotRelative.visible = visible;
        this.yAxisPlotRelative.renderer.grid.template.disabled = !visible;
        this.yAxisPlotRelative.tooltip.disabled = !visible;

        this.seriesAgeGroupSusceptible.setVisible(visible);
        this.seriesAgeGroupRemovedID.setVisible(visible);
        this.seriesAgeGroupRemovedIU.setVisible(visible);

        this.seriesAgeGroupRemovedVMI.setVisible(visible);
        this.seriesAgeGroupRemovedVMV.setVisible(visible);
        this.seriesAgeGroupRemovedVMU.setVisible(visible);
        this.seriesAgeGroupRemovedVR1.setVisible(visible);
        this.seriesAgeGroupRemovedVR2.setVisible(visible);
        this.seriesAgeGroupRemovedVRC.setVisible(false);

    }

    setSeriesEIVisible(visible: boolean): void {

        this.yAxisPlotRelative.visible = visible;
        this.yAxisPlotRelative.renderer.grid.template.disabled = !visible;
        this.yAxisPlotRelative.tooltip.disabled = !visible;

        this.seriesAgeGroupExposed.setVisible(visible);
        this.seriesAgeGroupInfectious.setVisible(visible);

    }

    setSeriesIncidenceVisible(visible: boolean): void {

        this.yAxisPlotIncidence.visible = visible;
        this.yAxisPlotIncidence.renderer.grid.template.disabled = !visible;
        this.yAxisPlotIncidence.tooltip.disabled = !visible;
        this.seriesAgeGroupIncidence.setVisible(visible);
        this.seriesAgeGroupIncidenceR.setVisible(visible);
        this.seriesAgeGroupCases.setVisible(visible);

        // set everything to invisible
        this.seriesAgeGroupIncidenceByStrain.forEach(seriesAgeGroupIncidence => {
            seriesAgeGroupIncidence.setVisible(false);
        });
        const modificationValuesStrain = Modifications.getInstance().findModificationsByType('STRAIN').map(m => m.getModificationValues() as IModificationValuesStrain);

        // specific incidence makes sense only if there is more than one strain
        if (visible && modificationValuesStrain.length > 1) {
            // turn all active strain back on
            modificationValuesStrain.forEach(strainValues => {
                this.getOrCreateSeriesAgeGroupIncidenceStrain(strainValues).setVisible(true);
            });
        }

    }

    setChartMode(chartMode: CHART_MODE______KEY): void {
        this.chartMode = chartMode;
        ControlsConstants.HEATMAP_DATA_PARAMS[this.chartMode].visitChart(this);
        this.requestRenderModelData();
    }

    getMaxInfections(): number {
        return this.maxInfectious;
    }

    setAxisRelativeMax(max: number): void {
        this.yAxisPlotRelative.max = max;
    }

    /**
     * pushes all modifications to SliderModification, where they will be drawn on the time, depending on actual type
     * @param key
     */
    async showModifications(modificationDefinition: IControlsChartDefinition, modificationData: IModificationData[]): Promise<void> {

        if (modificationDefinition) {

            this.seriesModification.setLabellingDefinition(modificationDefinition.labellingDefinition);
            this.seriesModification.setBaseLabel(modificationDefinition.text);
            this.seriesModification.setSeriesNote('');
            this.seriesModification.getSeries().fill = color(modificationDefinition.color);
            this.seriesModification.getSeries().fillOpacity = 0.20;
            ChartUtil.getInstance().configureAgeGroupSeries(this.seriesModification, modificationDefinition.color, modificationDefinition.useObjectColors);

            this.yAxisModification.min = modificationDefinition.min;
            this.yAxisModification.max = modificationDefinition.max;
            this.yAxisModification.invalidateLabels(); // labels may change from percent to non-percent and need to be invalidated

            this.seriesModification.getSeries().stroke = color(modificationDefinition.color);
            this.seriesModification.getSeries().data = modificationData;

        } else {
            // TODO reset display
        }

    }

    findDataItemByInstant(instant: number): IDataItem {
        if (ObjectUtil.isNotEmpty(this.modelData)) {
            return this.findDataItemByCategory(TimeUtil.formatCategoryDate(instant));
        }
        return null;
    }

    findDataItemByCategory(categoryX: string): IDataItem {
        if (ObjectUtil.isNotEmpty(this.modelData)) {
            return this.modelData.find(d => d.categoryX === categoryX);
        }
        return null;
    }

    async acceptModelData(modelData: IDataItem[]): Promise<void> {

        // console.log('modelData', modelData);

        const modificationValuesStrain = Modifications.getInstance().findModificationsByType('STRAIN').map(m => m.getModificationValues() as IModificationValuesStrain);
        modificationValuesStrain.forEach(strainValues => {
            // be sure there are series for each strain
            this.getOrCreateSeriesAgeGroupIncidenceStrain(strainValues);
        });

        this.setChartMode(this.chartMode);

        this.modelData = modelData;
        this.ageGroupsWithTotal = [...Demographics.getInstance().getAgeGroups(), new AgeGroup(Demographics.getInstance().getAgeGroups().length, {
            name: ModelConstants.AGEGROUP_NAME_______ALL,
            pG: Demographics.getInstance().getAbsTotal()
        })];

        // does not need to go through age ModelActions, because it just reapplies
        this.setSeriesAgeGroup(this.ageGroupIndex);

        this.requestRenderModelData();

    }

    applyMaxIncidence(): void {

        if (ObjectUtil.isNotEmpty(this.modelData)) {

            // console.log(this.xAxis.start, this.xAxis.end);

            const minCategory = this.xAxis.positionToCategory(this.xAxis.start);
            const maxCategory = this.xAxis.positionToCategory(this.xAxis.end);
            const minInstant = this.findDataItemByCategory(minCategory).instant;
            const maxInstant = this.findDataItemByCategory(maxCategory).instant;
            // console.log(minCategory, minInstant, ' >> ', maxCategory, maxInstant);

            let maxIncidence = 0;
            this.maxInfectious = 0;
            for (const dataItem of this.modelData) {
                if (dataItem.instant >= minInstant && dataItem.instant <= maxInstant) {
                    this.ageGroupsWithTotal.forEach(ageGroupHeat => {
                        maxIncidence = Math.max(maxIncidence, dataItem.valueset[ageGroupHeat.getName()].INCIDENCES[ModelConstants.STRAIN_ID___________ALL]);
                        this.maxInfectious = Math.max(this.maxInfectious, dataItem.valueset[ageGroupHeat.getName()].INFECTIOUS[ModelConstants.STRAIN_ID___________ALL]);
                    });
                }
            }

            this.yAxisPlotIncidence.min = 0;
            this.yAxisPlotIncidence.max = maxIncidence * 1.05;
            // this.yAxisPlotIncidence.strictMinMax = true;
            // this.yAxisPlotIncidence.start = 0;
            // this.yAxisPlotIncidence.end = 1;

            // console.log('maxIncidence', maxIncidence);
            this.applyMaxHeat(maxIncidence);

        }

    }

    applyMaxHeat(maxValue: number): void {

        const heatRule = this.seriesHeat.heatRules.getIndex(0) as any;
        heatRule.minValue = 0;
        heatRule.maxValue = ControlsConstants.HEATMAP_DATA_PARAMS[this.chartMode].getHeatMax(maxValue);
        heatRule.min = color(ChartUtil.getInstance().toColor(0, ControlsConstants.HEATMAP_DATA_PARAMS[this.chartMode]));
        heatRule.max = color(ChartUtil.getInstance().toColor(1, ControlsConstants.HEATMAP_DATA_PARAMS[this.chartMode]));

        this.chart.invalidateRawData();

    }

    private renderTimeout = -1;
    requestRenderModelData(): void {
        clearTimeout(this.renderTimeout);
        if (ObjectUtil.isNotEmpty(this.modelData)) {
            this.renderTimeout = window.setTimeout(() => {
                requestAnimationFrame(() => {
                    this.renderModelData();
                });
            }, 250);
        }
    }

    async renderModelData(): Promise<void> {

        // console.warn('rendering');
        clearTimeout(this.renderTimeout);

        const plotData: any[] = [];
        const heatData: any[] = [];

        const modificationValuesStrain = Modifications.getInstance().findModificationsByType('STRAIN').map(m => m.getModificationValues() as IModificationValuesStrain);

        const ageGroupPlot = this.ageGroupsWithTotal[this.ageGroupIndex];
        for (const dataItem of this.modelData) {

            // data independent from sub-strains
            const ageGroupSusceptible = dataItem.valueset[ageGroupPlot.getName()].SUSCEPTIBLE;
            const ageGroupExposed = dataItem.valueset[ageGroupPlot.getName()].EXPOSED[ModelConstants.STRAIN_ID___________ALL];;
            const ageGroupInfectious = dataItem.valueset[ageGroupPlot.getName()].INFECTIOUS[ModelConstants.STRAIN_ID___________ALL];
            const ageGroupRemovedID = dataItem.valueset[ageGroupPlot.getName()].REMOVED_ID;
            const ageGroupRemovedIU = dataItem.valueset[ageGroupPlot.getName()].REMOVED_IU;
            const ageGroupRemovedVM1 = dataItem.valueset[ageGroupPlot.getName()].REMOVED_V1;
            const ageGroupRemovedVM2 = dataItem.valueset[ageGroupPlot.getName()].REMOVED_V2;
            const ageGroupRemovedVMU = dataItem.valueset[ageGroupPlot.getName()].REMOVED_VR;
            const ageGroupRemovedVRC = dataItem.valueset[ageGroupPlot.getName()].REMOVED_VC;
            const ageGroupIncidence = dataItem.valueset[ageGroupPlot.getName()].INCIDENCES[ModelConstants.STRAIN_ID___________ALL];
            const ageGroupCases = dataItem.valueset[ageGroupPlot.getName()].CASES;

            const dataItemA = BaseData.getInstance().findBaseData(TimeUtil.formatCategoryDate(dataItem.instant - TimeUtil.MILLISECONDS_PER____DAY * 7));
            const dataItemB = BaseData.getInstance().findBaseData(TimeUtil.formatCategoryDate(dataItem.instant));
            let ageGroupRemovedVR1 = null;
            let ageGroupRemovedVR2 = null;
            let ageGroupIncidenceR = null;
            if (dataItemA && dataItemB) {
                ageGroupRemovedVR1 = BaseData.getVacc1(dataItemB, ageGroupPlot.getName()) / ageGroupPlot.getAbsValue();
                ageGroupRemovedVR2 = BaseData.getVacc2(dataItemB, ageGroupPlot.getName()) / ageGroupPlot.getAbsValue();
                ageGroupIncidenceR = (dataItemB[ageGroupPlot.getName()][ModelConstants.BASE_DATA_INDEX_EXPOSED] - dataItemA[ageGroupPlot.getName()][ModelConstants.BASE_DATA_INDEX_EXPOSED]) * 100000 / ageGroupPlot.getAbsValue();
            }

            const item = {
                categoryX: dataItem.categoryX,
                ageGroupSusceptible,
                ageGroupExposed,
                ageGroupInfectious,
                ageGroupRemovedID,
                ageGroupRemovedIU,
                ageGroupRemovedVM1,
                ageGroupRemovedVM2,
                ageGroupRemovedVMU,
                ageGroupRemovedVR1,
                ageGroupRemovedVR2,
                ageGroupRemovedVRC,
                ageGroupIncidence,
                ageGroupIncidenceR,
                ageGroupCases
            }

            modificationValuesStrain.forEach(modificationValueStrain => {
                item[`ageGroupIncidence${modificationValueStrain.id}`] = dataItem.valueset[ageGroupPlot.getName()].INCIDENCES[modificationValueStrain.id];
                item[`ageGroupExposed${modificationValueStrain.id}`] = dataItem.valueset[ageGroupPlot.getName()].EXPOSED[modificationValueStrain.id];
                item[`ageGroupInfectious${modificationValueStrain.id}`] = dataItem.valueset[ageGroupPlot.getName()].INFECTIOUS[modificationValueStrain.id];
            });

            plotData.push(item);

        }

        let maxValue = 0;
        const randomVd = Math.random() * 0.00001;
        for (const dataItem of this.modelData) {

            const dataItemA = BaseData.getInstance().findBaseData(TimeUtil.formatCategoryDate(dataItem.instant - TimeUtil.MILLISECONDS_PER____DAY * 7));
            const dataItemB = BaseData.getInstance().findBaseData(TimeUtil.formatCategoryDate(dataItem.instant));
            // console.log('incidenceItem', dataItemA, dataItemB);

            this.ageGroupsWithTotal.forEach(ageGroupHeat => {

                let value = ControlsConstants.HEATMAP_DATA_PARAMS[this.chartMode].getHeatValue(dataItem, ageGroupHeat.getName());

                let color: string;
                if (ChartAgeGroup.showDiffDisplay && dataItemA && dataItemB) {

                    const baseIncidence = (dataItemB[ageGroupHeat.getName()][ModelConstants.BASE_DATA_INDEX_EXPOSED] - dataItemA[ageGroupHeat.getName()][ModelConstants.BASE_DATA_INDEX_EXPOSED]) * 100000 / ageGroupHeat.getAbsValue();
                    value -= baseIncidence;
                    // const baseVaccination = dataItemB[ageGroupHeat.getName()][ModelConstants.BASE_DATA_INDEX_VACC1ST] / ageGroupHeat.getAbsValue();
                    // value -= baseVaccination;

                    let r = 0;
                    let g = 0;
                    let b = 0;
                    if (value >= 0) {
                        g = value / 25; // .05;
                    }
                    else {
                        r = value / -25; // -.05;
                    }
                    const rgb = [r, g, b];
                    const hsv = [0, 0, 0];
                    ColorUtil.rgbToHsv(rgb, hsv);
                    color = new Color(hsv[0], hsv[1], hsv[2]).getHex();

                }

                const label = ControlsConstants.HEATMAP_DATA_PARAMS[this.chartMode].getHeatLabel(value);
                heatData.push({
                    categoryX: dataItem.categoryX,
                    categoryY: ageGroupHeat.getName(),
                    index: ageGroupHeat.getIndex(),
                    value: value + randomVd,
                    label,
                    color
                });
                maxValue = Math.max(maxValue, value);

            });

        }

        const chartData = [...plotData, ...heatData];

        this.applyMaxHeat(maxValue);

        // console.log('chartData', chartData);

        if (this.chart.data.length === chartData.length && !ChartAgeGroup.showDiffDisplay) {
            for (let i = 0; i < chartData.length; i++) {
                for (const key of Object.keys(chartData[i])) { // const key in chartData[i]
                    this.chart.data[i][key] = chartData[i][key];
                }
            }
            this.chart.invalidateRawData();
        } else {
            this.chart.data = chartData;
        }

    }

}

