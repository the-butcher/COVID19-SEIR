import { CategoryAxis, Column, ColumnSeries, LineSeries, StepLineSeries, ValueAxis, XYChart, XYCursor } from "@amcharts/amcharts4/charts";
import { color, create, percent, Rectangle, useTheme } from "@amcharts/amcharts4/core";
import am4themes_animated from '@amcharts/amcharts4/themes/animated';
import am4themes_dark from '@amcharts/amcharts4/themes/dark';
import { IModificationValuesStrain } from '../../common/modification/IModificationValuesStrain';
import { ModificationContact } from '../../common/modification/ModificationContact';
import { Modifications } from '../../common/modification/Modifications';
import { BaseData } from '../../model/basedata/BaseData';
import { Color } from '../../util/Color';
import { QueryUtil } from '../../util/QueryUtil';
import { CHART_MODE______KEY, ControlsConstants, IControlsChartDefinition } from '../gui/ControlsConstants';
import { SliderModification } from '../gui/SliderModification';
import { StorageUtil } from '../storage/StorageUtil';
import { Demographics } from './../../common/demographics/Demographics';
import { ModelConstants } from './../../model/ModelConstants';
import { ModelInstants } from './../../model/ModelInstants';
import { IDataItem } from './../../model/state/ModelStateIntegrator';
import { ColorUtil } from './../../util/ColorUtil';
import { ICoordinate } from './../../util/ICoordinate';
import { ObjectUtil } from './../../util/ObjectUtil';
import { TimeUtil } from './../../util/TimeUtil';
import { ControlsVaccination } from './../controls/ControlsVaccination';
import { ModelActions } from './../gui/ModelActions';
import { ChartAgeGroupSeries } from './ChartAgeGroupSeries';
import { ChartUtil } from './ChartUtil';
import regression, { DataPoint } from 'regression';

export interface IModificationData {
    categoryX: string,
    modValueY: number
}

/**
 * central chart of the application
 *
 * @author h.fleischer
 * @since 16.05.2021
 */
export class ChartAgeGroup {

    // static readonly showDiffDisplay = false;

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

    /**
     * absolute values, bound to incidence with an adapter
     */
    protected readonly yAxisPlotAbsolute: ValueAxis;

    /**
     * percentage axis 0-100
     */
    protected readonly yAxisPlotPercent_000_100: ValueAxis;
    protected readonly yAxisPlotPercent_m75_p75: ValueAxis;

    /**
     * incidence axis
     */
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

    /**
     * visualize multipliers and corrections (for readability and plausibility)
     */
    protected readonly seriesContactMultiplier: ChartAgeGroupSeries;
    protected readonly seriesContactCorrection: ChartAgeGroupSeries;


    /**
     * cases as of model
     */
    protected readonly seriesAgeGroupCasesP: ChartAgeGroupSeries;

    /**
     * cases as of model + expected daily offset
     */
    protected readonly seriesAgeGroupCasesN: ChartAgeGroupSeries;

    /**
     * cases as reported age-wise
     */
    protected readonly seriesAgeGroupCasesR: ChartAgeGroupSeries;

    /**
     * SEIR susceptible
     */
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
    protected readonly seriesPositivityRateR: ChartAgeGroupSeries; // real test numbers

    /**
     * real average cases
     */
    protected readonly seriesAgeGroupAverageCasesR: ChartAgeGroupSeries;

    /**
     * real calculated reproduction rate
     */
    protected readonly seriesAgeGroupReproductionR: ChartAgeGroupSeries; // reproduction rate based on real cases


    protected readonly seriesModification: ChartAgeGroupSeries;

    protected readonly seriesHeat: ColumnSeries;

    private absValue: number; // the absolute value of the age-group currently displayed
    private ageGroupIndex: number;
    private categoryName: string;
    private modelData: IDataItem[];
    private chartMode: CHART_MODE______KEY;

    private ageGroupMarker: Rectangle;
    private intervalHandle: number;

    private constructor() {

        useTheme(am4themes_dark);
        useTheme(am4themes_animated);

        this.absValue = 0;
        this.ageGroupIndex = -1;
        this.categoryName = 'other';
        this.chartMode = 'INCIDENCE';

        this.chart = create('chartDivAgeGroupPlot', XYChart);

        ChartUtil.getInstance().configureLegend(this.chart);
        ChartUtil.getInstance().configureChartPadding(this.chart);
        ChartUtil.getInstance().configureSeparators(this.chart);

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
        this.xAxis.renderer.grid.template.disabled = true;

        this.xAxis.tooltip.label.rotation = -90;
        this.xAxis.tooltip.label.horizontalCenter = 'right';
        this.xAxis.tooltip.label.verticalCenter = 'middle';

        this.addWeekendRanges();

        this.yAxisPlotAbsolute = this.chart.yAxes.push(new ValueAxis());
        ChartUtil.getInstance().configureAxis(this.yAxisPlotAbsolute, 'population');
        this.yAxisPlotAbsolute.tooltip.exportable = false;
        this.yAxisPlotAbsolute.rangeChangeDuration = 0;
        this.yAxisPlotAbsolute.strictMinMax = true;
        this.yAxisPlotAbsolute.visible = false;
        this.yAxisPlotAbsolute.renderer.grid.template.disabled = true;
        this.yAxisPlotAbsolute.tooltip.disabled = true;

        this.yAxisPlotPercent_000_100 = this.chart.yAxes.push(new ValueAxis());
        ChartUtil.getInstance().configureAxis(this.yAxisPlotPercent_000_100, 'Population %');
        this.yAxisPlotPercent_000_100.tooltip.exportable = false;
        this.yAxisPlotPercent_000_100.visible = false;
        this.yAxisPlotPercent_000_100.renderer.grid.template.disabled = true;
        this.yAxisPlotPercent_000_100.rangeChangeDuration = 0;
        this.yAxisPlotPercent_000_100.strictMinMax = true;
        this.yAxisPlotPercent_000_100.min = 0.00;
        this.yAxisPlotPercent_000_100.max = 1.01; // some extra required, or 100% label will not show

        this.yAxisPlotPercent_000_100.renderer.labels.template.adapter.add('text', (value, target) => {
            return ChartUtil.getInstance().formatLabelOrTooltipValue(value, this.yAxisPlotPercent_000_100.max >= 1 ? ControlsConstants.LABEL_PERCENT___FIXED : ControlsConstants.LABEL_PERCENT__FLOAT_2);
        });
        this.yAxisPlotPercent_000_100.tooltip.label.adapter.add('text', (value, target) => {
            return ChartUtil.getInstance().formatLabelOrTooltipValue(value, this.yAxisPlotPercent_000_100.max >= 1 ? ControlsConstants.LABEL_PERCENT___FIXED : ControlsConstants.LABEL_PERCENT__FLOAT_2);
        });

        this.yAxisPlotPercent_m75_p75 = this.chart.yAxes.push(new ValueAxis());
        ChartUtil.getInstance().configureAxis(this.yAxisPlotPercent_m75_p75, 'Population %');
        this.yAxisPlotPercent_m75_p75.tooltip.exportable = false;
        this.yAxisPlotPercent_m75_p75.visible = false;
        this.yAxisPlotPercent_m75_p75.renderer.grid.template.disabled = true;
        this.yAxisPlotPercent_m75_p75.rangeChangeDuration = 0;
        this.yAxisPlotPercent_m75_p75.strictMinMax = true;
        this.yAxisPlotPercent_m75_p75.min = -0.75;
        this.yAxisPlotPercent_m75_p75.max =  0.75; // some extra required, or 100% label will not show
        this.yAxisPlotPercent_m75_p75.tooltip.disabled = true;


        this.yAxisPlotPercent_m75_p75.renderer.labels.template.adapter.add('text', (value, target) => {
            return ChartUtil.getInstance().formatLabelOrTooltipValue(value, this.yAxisPlotPercent_m75_p75.max >= 1 ? ControlsConstants.LABEL_PERCENT___FIXED : ControlsConstants.LABEL_PERCENT__FLOAT_2);
        });
        this.yAxisPlotPercent_m75_p75.tooltip.label.adapter.add('text', (value, target) => {
            return ChartUtil.getInstance().formatLabelOrTooltipValue(value, this.yAxisPlotPercent_m75_p75.max >= 1 ? ControlsConstants.LABEL_PERCENT___FIXED : ControlsConstants.LABEL_PERCENT__FLOAT_2);
        });



        // incidence axis
        this.yAxisPlotIncidence = this.chart.yAxes.push(new ValueAxis());
        this.yAxisPlotIncidence.rangeChangeDuration = 0;
        this.yAxisPlotIncidence.strictMinMax = true;
        ChartUtil.getInstance().configureAxis(this.yAxisPlotIncidence, '7-day incidence / ' + (100000).toLocaleString());
        this.yAxisPlotIncidence.tooltip.exportable = false;

        // modification indicator axis
        this.yAxisModification = this.chart.yAxes.push(new ValueAxis());
        this.yAxisModification.tooltip.exportable = false;
        this.yAxisModification.strictMinMax = true;
        this.yAxisModification.rangeChangeDuration = 0;
        this.yAxisModification.zoomable = false;
        ChartUtil.getInstance().configureAxis(this.yAxisModification, 'Mods');
        this.yAxisModification.renderer.labels.template.adapter.add('text', (value) => {
            return ChartUtil.getInstance().formatLabelOrTooltipValue(value, this.seriesModification.getLabellingDefinition());
        });
        this.yAxisModification.tooltip.label.adapter.add('text', (value, target) => {
            return ChartUtil.getInstance().formatLabelOrTooltipValue(value, this.seriesModification.getLabellingDefinition());
        });

        this.seriesContactMultiplier = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent_000_100,
            title: 'multipliers',
            baseLabel: 'multipliers',
            valueField: 'contactMultiplier',
            colorKey: 'CONTACT',
            strokeWidth: 2,
            dashed: false,
            locationOnPath: 0.40,
            labelled: true,
            stacked: false,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });

        this.seriesContactCorrection = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent_000_100,
            title: 'corrections',
            baseLabel: 'corrections',
            valueField: 'contactCorrection',
            colorKey: 'CONTACT',
            strokeWidth: 2,
            dashed: false,
            locationOnPath: 0.40,
            labelled: true,
            stacked: false,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });


        this.seriesAgeGroupCasesP = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotAbsolute,
            title: 'average cases (model)',
            baseLabel: 'average cases (model)',
            valueField: 'ageGroupCasesP',
            colorKey: 'CASES',
            strokeWidth: 2,
            dashed: false,
            locationOnPath: 0.40,
            labelled: true,
            stacked: false,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_ABSOLUTE_FIXED,
            seriesConstructor: () => new LineSeries()
        });

        this.seriesAgeGroupCasesR = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotAbsolute,
            title: 'cases (ages)',
            baseLabel: 'cases',
            valueField: 'ageGroupCasesR',
            colorKey: 'CASES',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.90,
            labelled: true,
            stacked: false,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_ABSOLUTE_FIXED,
            seriesConstructor: () => new StepLineSeries()
        });

        this.seriesAgeGroupCasesN = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotAbsolute,
            title: 'cases (model)',
            baseLabel: 'cases (model)',
            valueField: 'ageGroupCasesN',
            colorKey: 'SEASONALITY',
            strokeWidth: 0.5,
            dashed: false,
            locationOnPath: 1.10,
            labelled: true,
            stacked: false,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_ABSOLUTE_FIXED,
            seriesConstructor: () => new StepLineSeries()
        });


        this.seriesAgeGroupLabelLocation = 0.5;
        this.seriesAgeGroupIncidence = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotIncidence,
            title: 'incidence (model)',
            baseLabel: 'incidence (model)',
            valueField: 'ageGroupIncidence',
            colorKey: 'INCIDENCE',
            strokeWidth: 2,
            dashed: false,
            locationOnPath: 0.10,
            labelled: true,
            stacked: false,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_ABSOLUTE_FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });
        this.seriesAgeGroupIncidenceR = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotIncidence,
            title: 'incidence (ages)',
            baseLabel: 'incidence (ages)',
            valueField: 'ageGroupIncidenceR',
            colorKey: 'STRAIN',
            strokeWidth: 2,
            dashed: false,
            locationOnPath: 0.35,
            labelled: true,
            stacked: false,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_ABSOLUTE_FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });
        this.seriesAgeGroupIncidenceR.getSeries().tooltip.exportable = false;

        this.seriesAgeGroupAverageCasesR = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotAbsolute,
            title: 'average cases (ages)',
            baseLabel: 'average cases (ages)',
            valueField: 'ageGroupAverageCasesR',
            colorKey: 'CASES',
            strokeWidth: 1,
            dashed: true,
            locationOnPath: 0.35,
            labelled: true,
            stacked: false,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_ABSOLUTE_FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });

        this.seriesAgeGroupReproductionR = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent_m75_p75,
            title: 'reproduction rate (ages)',
            baseLabel: 'reproduction',
            valueField: 'ageGroupReproductionR',
            colorKey: 'VACCINATION',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.35,
            labelled: false,
            stacked: false,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });

        this.seriesAgeGroupIncidenceByStrain = new Map();

        this.seriesAgeGroupRemovedVMV = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent_000_100,
            title: 'vaccinated',
            baseLabel: 'vaccinated, full',
            valueField: 'ageGroupRemovedVM2',
            colorKey: 'VACCINATION',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.15,
            labelled: false,
            stacked: true,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });

        this.seriesAgeGroupRemovedVMI = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent_000_100,
            title: 'immunizing',
            baseLabel: 'immunizing',
            valueField: 'ageGroupRemovedVM1',
            colorKey: 'SUSCEPTIBLE',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.05,
            labelled: false,
            stacked: true,
            legend: false,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });

        this.seriesAgeGroupRemovedVMU = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent_000_100,
            title: 'vaccinated, after asymptomatic infection',
            baseLabel: 'vaccinated, after asymptomatic infection',
            valueField: 'ageGroupRemovedVMU',
            colorKey: 'REMOVED',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.25,
            labelled: false,
            stacked: true,
            legend: false,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });

        /**
         * recovered after known infection
         */
        this.seriesAgeGroupRemovedID = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent_000_100,
            title: 'recovered',
            baseLabel: 'recovered after symptomatic infection',
            valueField: 'ageGroupRemovedID',
            colorKey: 'REMOVED',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.15,
            labelled: false,
            stacked: true,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });

        /**
         * recovered after asymptomatic infection
         */
        this.seriesAgeGroupRemovedIU = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent_000_100,
            title: 'recovered',
            baseLabel: 'recovered after asymptomatic infection',
            valueField: 'ageGroupRemovedIU',
            colorKey: 'REMOVED',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.25,
            labelled: false,
            stacked: true,
            legend: false,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });
        this.seriesAgeGroupRemovedID.bindToLegend(this.seriesAgeGroupRemovedIU);
        this.seriesAgeGroupRemovedID.bindToLegend(this.seriesAgeGroupRemovedVMU);

        this.seriesAgeGroupSusceptible = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent_000_100,
            title: 'susceptible',
            baseLabel: 'susceptible',
            valueField: 'ageGroupSusceptible',
            colorKey: 'SUSCEPTIBLE',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.05,
            labelled: false,
            stacked: true,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });
        this.seriesAgeGroupSusceptible.bindToLegend(this.seriesAgeGroupRemovedVMI);

        this.seriesAgeGroupExposed = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent_000_100,
            title: 'exposed',
            baseLabel: 'exposed',
            valueField: 'ageGroupExposed',
            colorKey: 'EXPOSED',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.25,
            labelled: false,
            stacked: true,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2_ABS,
            seriesConstructor: () => new LineSeries()
        });
        this.seriesAgeGroupInfectious = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent_000_100,
            title: 'infectious',
            baseLabel: 'infectious',
            valueField: 'ageGroupInfectious',
            colorKey: 'INFECTIOUS',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.45,
            labelled: false,
            stacked: true,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2_ABS,
            seriesConstructor: () => new LineSeries()
        });

        /**
         * vaccinated (first)
         */
        this.seriesAgeGroupRemovedVR1 = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent_000_100,
            title: 'vaccinated',
            baseLabel: 'vaccinated, partial',
            valueField: 'ageGroupRemovedVR1',
            colorKey: 'SEASONALITY',
            strokeWidth: 1,
            dashed: true,
            locationOnPath: 0.25,
            labelled: false,
            stacked: false,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });

        /**
         * vaccinated (complete)
         */
        this.seriesAgeGroupRemovedVR2 = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent_000_100,
            title: 'vaccinated',
            baseLabel: 'vaccinated, full',
            valueField: 'ageGroupRemovedVR2',
            colorKey: 'SEASONALITY',
            strokeWidth: 1,
            dashed: true,
            locationOnPath: 0.35,
            labelled: false,
            stacked: false,
            legend: false,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });
        this.seriesAgeGroupRemovedVR1.bindToLegend(this.seriesAgeGroupRemovedVR2);

        /**
         * vaccinated (control curve)
         */
        this.seriesAgeGroupRemovedVRC = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent_000_100,
            title: 'vaccinated',
            baseLabel: 'vaccinated, full',
            valueField: 'ageGroupRemovedVRC',
            colorKey: 'INFECTIOUS',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.45,
            labelled: false,
            stacked: false,
            legend: false,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2,
            seriesConstructor: () => new LineSeries()
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
            stacked: false,
            legend: false,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });

        this.seriesPositivityRateR = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent_000_100,
            title: 'positivity rate',
            baseLabel: 'positivity',
            valueField: 'positivityRateR',
            colorKey: 'TESTING',
            strokeWidth: 2,
            dashed: false,
            locationOnPath: 0.35,
            labelled: true,
            stacked: false,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_ABSOLUTE_FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });

        this.chart.cursor = new XYCursor();
        this.chart.cursor.xAxis = this.xAxis;
        this.chart.cursor.showTooltipOn = 'always';
        this.chart.cursor.exportable = true;
        this.chart.cursor.events.on('cursorpositionchanged', e => {

            const position = this.xAxis.pointToPosition(e.target.point);
            const category = this.xAxis.positionToCategory(position);
            const chartDataItem = this.findDataItemByCategory(category);
            if (chartDataItem) {
                const baseDataItem = BaseData.getInstance().findBaseDataItem(chartDataItem.instant);
                if (baseDataItem && baseDataItem.getIncidence(this.ageGroupIndex)) {
                    // this.seriesAgeGroupCasesR.getSeries().tooltip.disabled = false;
                    this.seriesAgeGroupIncidenceR.getSeries().tooltip.disabled = false;
                } else {
                    // this.seriesAgeGroupCasesR.getSeries().tooltip.disabled = true;
                    this.seriesAgeGroupIncidenceR.getSeries().tooltip.disabled = true;
                }
            }

        });
        this.chart.cursor.lineX.disabled = false;
        this.chart.cursor.lineY.disabled = true;

        this.chart.zoomOutButton.disabled = false;
        this.chart.zoomOutButton.background.fill = color('#555555');
        this.chart.zoomOutButton.background.states.getKey('down')!.properties.fill = color('#777777');
        this.chart.zoomOutButton.background.states.getKey('hover')!.properties.fill = color('#999999');
        this.chart.zoomOutButton.dy = 30;
        this.chart.zoomOutButton.scale = 0.77;

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
        this.seriesHeat.dataFields.value = 'gamma';
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
            ModelActions.getInstance().toggleAgeGroup(index);
        });
        if (QueryUtil.getInstance().isDiffDisplay()) {
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

        /**
         * when the xAxis range changes, modification-slider ticks need to be scaled as well
         */
        this.xAxis.events.on('startendchanged', e => {

            // console.log('startendchanged')

            const minCategory = this.xAxis.positionToCategory(this.xAxis.start);
            const maxCategory = this.xAxis.positionToCategory(this.xAxis.end);
            const minInstant = this.findDataItemByCategory(minCategory).instant;
            const maxInstant = this.findDataItemByCategory(maxCategory).instant;

            const ticks = SliderModification.getInstance().getTickValues().filter(t => t > minInstant && t < maxInstant);

            SliderModification.getInstance().setRange([minInstant, ...ticks, maxInstant]);
            this.applyMaxYAxisValue();

        });

        this.yAxisPlotIncidence.adapter.add('min', (value, target) => {
            // console.log('min', value);
            value = 0;
            this.yAxisPlotAbsolute.min = value * this.absValue / 700000;
            return value;
        });
        this.yAxisPlotIncidence.adapter.add('max', (value, target) => {
            // console.log('max', value);
            // value = 1000;
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
            this.yAxisPlotPercent_000_100.y = percent(pixelPosPlot * pp);
            this.yAxisPlotPercent_m75_p75.y = percent(pixelPosPlot * pp);
            this.yAxisPlotIncidence.y = percent(pixelPosPlot * pp);
            this.yAxisHeat.y = percent(pixelPosHeat * pp);
            this.yAxisModification.y = percent(pixelPosModification * pp);

            this.yAxisModification.height = percent(pixelHeightModification * pp);

            this.yAxisPlotAbsolute.height = percent(pixelHeightPlot * pp);
            this.yAxisPlotPercent_000_100.height = percent(pixelHeightPlot * pp);
            this.yAxisPlotPercent_m75_p75.height = percent(pixelHeightPlot * pp);
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
        return Demographics.getInstance().getAgeGroupsWithTotal()[this.ageGroupIndex].getName();
    }

    getAgeGroupIndex(): number {
        return this.ageGroupIndex >= 0 ? this.ageGroupIndex : Demographics.getInstance().getAgeGroups().length;
    }

    getAbsValue(): number {
        return this.absValue;
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

    async setAgeGroupIndex(ageGroupIndex: number): Promise<void> {

        const requiresBaseDataRender = this.ageGroupIndex !== ageGroupIndex;
        this.ageGroupIndex = ageGroupIndex;
        const ageGroup = Demographics.getInstance().getAgeGroupsWithTotal()[this.ageGroupIndex];
        this.absValue = ageGroup.getAbsValue();

        if (ObjectUtil.isNotEmpty(this.modelData)) {

            if (requiresBaseDataRender) {
                this.renderBaseData();
            }
            this.requestRenderModelData();

            // wait for the series heat to be ready, then place marker
            clearInterval(this.intervalHandle);
            this.intervalHandle = window.setInterval(() => {
                if (this.seriesHeat.columns.length > 0) {

                    const templateColumn = this.seriesHeat.columns.getIndex(0);

                    const minX = this.xAxis.categoryToPoint(TimeUtil.formatCategoryDate(SliderModification.getInstance().getMinValue())).x - templateColumn.realWidth / 2;
                    // const maxX = this.xAxis.categoryToPoint(TimeUtil.formatCategoryDate(SliderModification.getInstance().getMinValue())).x + templateColumn.realWidth / 2;

                    const minY = this.yAxisHeat.categoryToPoint(ageGroup.getName()).y - templateColumn.realHeight / 2;
                    const maxY = minY + templateColumn.realHeight;

                    // place the marker rectangle
                    this.ageGroupMarker.x = minX - 4;
                    this.ageGroupMarker.y = this.yAxisHeat.pixelY + maxY;
                    this.ageGroupMarker.width = 2;
                    this.ageGroupMarker.height = minY - maxY;

                    clearInterval(this.intervalHandle);

                }
            }, 100);



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

            // this.applyMaxYAxisValue();

        }

        this.seriesAgeGroupIncidence.setSeriesNote(ageGroup.getName());
        this.seriesAgeGroupIncidenceR.setSeriesNote(ageGroup.getName());

        this.seriesAgeGroupAverageCasesR.setSeriesNote(ageGroup.getName());

        this.seriesAgeGroupReproductionR.setSeriesNote(ageGroup.getName());
        this.seriesAgeGroupCasesP.setSeriesNote(ageGroup.getName());
        this.seriesAgeGroupCasesN.setSeriesNote(ageGroup.getName());
        this.seriesAgeGroupCasesR.setSeriesNote(ageGroup.getName());
        this.seriesPositivityRateR.setSeriesNote(ModelConstants.AGEGROUP_NAME_______ALL);

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

        this.seriesContactCorrection.setSeriesNote(ageGroup.getName());

    }

    async setContactCategory(categoryName: string): Promise<void> {

        this.categoryName = categoryName;
        this.seriesContactMultiplier.setSeriesNote(this.categoryName);

        if (ObjectUtil.isNotEmpty(this.modelData)) {
            this.requestRenderModelData();
        }

    }

    addWeekendRanges(): void {

        // let sunInstant = new Date('2021-01-03'); // Date and time (GMT): Sunday, 3. January 2021 12:00:00;

        const minInstant = ModelInstants.getInstance().getMinInstant();
        const maxInstant = ModelInstants.getInstance().getMaxInstant();

        for (let instant = minInstant; instant <= maxInstant; instant += TimeUtil.MILLISECONDS_PER____DAY) {

            const range = this.xAxis.axisRanges.create();
            range.category = TimeUtil.formatCategoryDate(instant);
            range.label.visible = false;

            range.axisFill.fillOpacity = 0.00;
            range.axisFill.strokeOpacity = 0.75;
            range.axisFill.strokeWidth = 0.50;
            if (new Date(instant).getDay() === 0) {
                range.grid.stroke  = color(ControlsConstants.COLOR____FONT).brighten(-0.20);
            } else {
                range.grid.stroke  = color(ControlsConstants.COLOR____FONT).brighten(-0.60);
            }

        }

    }

    toVaccinationCoordinate(documentCoordinate: ICoordinate): ICoordinate {

        const containerBounds = document.getElementById('chartDivAgeGroupPlot').getBoundingClientRect();

        const offsetX = containerBounds.left + this.chart.pixelPaddingLeft + this.chart.plotContainer.pixelX + this.xAxis.pixelX;
        const offsetY = containerBounds.top + this.chart.pixelPaddingTop + this.chart.plotContainer.pixelY + this.yAxisPlotPercent_000_100.pixelY;

        const offsetCoordinate = {
            x: documentCoordinate.x - offsetX,
            y: documentCoordinate.y - offsetY
        }

        const minInstant = ModelInstants.getInstance().getMinInstant();
        const maxInstant = ModelInstants.getInstance().getMaxInstant();

        const minCategoryX = TimeUtil.formatCategoryDate(minInstant);
        const maxCategoryX = TimeUtil.formatCategoryDate(maxInstant);
        const minPointX =  this.xAxis.categoryToPoint(minCategoryX).x;
        const maxPointX =  this.xAxis.categoryToPoint(maxCategoryX).x;
        const fctPointX = (offsetCoordinate.x - minPointX) / (maxPointX - minPointX);
        const vacPointX = minInstant + (maxInstant - minInstant) * fctPointX;

        // round to closest midnight
        const valueX = Math.round(vacPointX / TimeUtil.MILLISECONDS_PER____DAY) * TimeUtil.MILLISECONDS_PER____DAY;

        const positionY =  this.yAxisPlotPercent_000_100.pointToPosition(offsetCoordinate);
        const valueY = this.yAxisPlotPercent_000_100.positionToValue(positionY);

        return {
            x: valueX,
            y: valueY
        }

    }

    toDocumentCoordinate(vaccinationCoordinate: ICoordinate): ICoordinate {

        const containerBounds = document.getElementById('chartDivAgeGroupPlot').getBoundingClientRect();

        const offsetX = containerBounds.left + this.chart.pixelPaddingLeft + this.chart.plotContainer.pixelX + this.xAxis.pixelX;
        const offsetY = containerBounds.top + this.chart.pixelPaddingTop + this.chart.plotContainer.pixelY + this.yAxisPlotPercent_000_100.pixelY;

        const minCategoryX = TimeUtil.formatCategoryDate(ModelInstants.getInstance().getMinInstant());
        const maxCategoryX = TimeUtil.formatCategoryDate(ModelInstants.getInstance().getMaxInstant());
        const minPointX =  this.xAxis.categoryToPoint(minCategoryX).x;
        const maxPointX =  this.xAxis.categoryToPoint(maxCategoryX).x;
        const fctPointX = (vaccinationCoordinate.x - ModelInstants.getInstance().getMinInstant()) / (ModelInstants.getInstance().getMaxInstant() - ModelInstants.getInstance().getMinInstant());

        const pointX = minPointX + (maxPointX - minPointX) * fctPointX;
        const pointY = this.yAxisPlotPercent_000_100.valueToPoint(vaccinationCoordinate.y).y;

        return {
            x: offsetX + pointX,
            y: offsetY + pointY
        }

    }

    /**
     * ensures presence of a series for the given strain
     *
     * @param strainValues
     * @returns
     */
    getOrCreateSeriesAgeGroupIncidenceStrain(strainValues: IModificationValuesStrain): ChartAgeGroupSeries {

        if (!this.seriesAgeGroupIncidenceByStrain.has(strainValues.id)) {

            const seriesAgeGroupIncidenceStrain = new ChartAgeGroupSeries({
                chart: this.chart,
                yAxis: this.yAxisPlotIncidence,
                title: `incidence (${strainValues.name})`,
                baseLabel: `incidence (${strainValues.name})`,
                valueField: `ageGroupIncidence${strainValues.id}`,
                colorKey: 'INCIDENCE',
                strokeWidth: 1,
                dashed: true,
                locationOnPath: this.seriesAgeGroupLabelLocation,
                labelled: false,
                stacked: false,
                legend: false,
                labellingDefinition: ControlsConstants.LABEL_ABSOLUTE_FLOAT_2,
                seriesConstructor: () => new LineSeries()
            });

            // toggle strain incidence with primary incidence
            this.seriesAgeGroupIncidence.bindToLegend(seriesAgeGroupIncidenceStrain);

            this.seriesAgeGroupIncidenceByStrain.set(strainValues.id, seriesAgeGroupIncidenceStrain);
            this.seriesAgeGroupLabelLocation += 0.1;
            if (this.seriesAgeGroupLabelLocation > 0.8) {
                this.seriesAgeGroupLabelLocation = 0.5;
            }

        }

        const seriesAgeGroup = this.seriesAgeGroupIncidenceByStrain.get(strainValues.id);
        seriesAgeGroup.setBaseLabel(strainValues.name);
        // seriesAgeGroup.setVisible(this.chartMode === 'INCIDENCE');
        seriesAgeGroup.setVisible(false);
        return seriesAgeGroup;

    }

    setSeriesSRVisible(visible: boolean): void {

        this.yAxisPlotPercent_000_100.visible = visible;
        this.yAxisPlotPercent_000_100.renderer.grid.template.disabled = !visible;
        this.yAxisPlotPercent_000_100.tooltip.disabled = !visible;

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

    setSeriesEIVisible(visible: boolean, stacked: boolean): void {

        this.yAxisPlotPercent_000_100.visible = visible;
        this.yAxisPlotPercent_000_100.renderer.grid.template.disabled = !visible;
        this.yAxisPlotPercent_000_100.tooltip.disabled = !visible;

        this.seriesAgeGroupExposed.setVisible(visible);
        this.seriesAgeGroupInfectious.setVisible(visible);

        this.seriesAgeGroupExposed.setStacked(stacked);
        this.seriesAgeGroupInfectious.setStacked(stacked);

    }

    setSeriesIncidenceVisible(visible: boolean): void {

        this.yAxisPlotIncidence.visible = visible;
        this.yAxisPlotIncidence.renderer.grid.template.disabled = !visible;
        this.yAxisPlotIncidence.tooltip.disabled = !visible;

        this.seriesAgeGroupIncidence.setVisible(visible); // visible
        this.seriesAgeGroupIncidenceR.setVisible(visible); // visible

        this.seriesAgeGroupAverageCasesR.setVisible(visible);

        this.seriesAgeGroupReproductionR.setVisible(false);

        this.seriesAgeGroupCasesP.setVisible(visible);
        this.seriesAgeGroupCasesN.setVisible(visible); // visible
        this.seriesAgeGroupCasesR.setVisible(visible); // visible

        // set everything to invisible
        this.seriesAgeGroupIncidenceByStrain.forEach(seriesAgeGroupIncidence => {
            seriesAgeGroupIncidence.setVisible(false);
        });
        const modificationValuesStrain = Modifications.getInstance().findModificationsByType('STRAIN').map(m => m.getModificationValues() as IModificationValuesStrain);

        // specific incidence makes sense only if there is more than one strain
        if (visible && modificationValuesStrain.length > 1) {
            // turn all active strain back on
            modificationValuesStrain.forEach(strainValues => {
                this.getOrCreateSeriesAgeGroupIncidenceStrain(strainValues).setVisible(false);
            });
        }

    }

    setSeriesContactVisible(visible: boolean): void {

        this.yAxisPlotPercent_000_100.visible = visible;
        this.yAxisPlotPercent_000_100.renderer.grid.template.disabled = !visible;
        this.yAxisPlotPercent_000_100.tooltip.disabled = !visible;

        this.seriesContactMultiplier.setVisible(visible);
        this.seriesContactCorrection.setVisible(visible);

    }

    setSeriesTestingVisible(visible: boolean): void {
        this.seriesPositivityRateR.setVisible(visible);
    }

    setChartMode(chartMode: CHART_MODE______KEY): void {
        this.chartMode = chartMode;
        ControlsConstants.HEATMAP_DATA_PARAMS[this.chartMode].visitChart(this);
        this.requestRenderModelData();
    }

    setAxisRelativeMax(max: number): void {
        // console.log('rel');
        this.yAxisPlotPercent_000_100.max = max;
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
            this.seriesModification.getSeries().tooltip.exportable = false;

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

        // does not need to go through age ModelActions, because it just reapplies
        // this.setSeriesAgeGroup(-1);

        this.requestRenderModelData();

    }

    applyMaxYAxisValue(): void {

        if (ObjectUtil.isNotEmpty(this.modelData)) {

            const minCategory = this.xAxis.positionToCategory(this.xAxis.start);
            const maxCategory = this.xAxis.positionToCategory(this.xAxis.end);
            const minInstant = this.findDataItemByCategory(minCategory).instant;
            const maxInstant = this.findDataItemByCategory(maxCategory).instant;

            let maxIncidence = 0;
            let maxInfectious = 0;
            for (const dataItem of this.modelData) {
                if (dataItem.instant >= minInstant && dataItem.instant <= maxInstant) {
                    Demographics.getInstance().getAgeGroups().forEach(ageGroupHeat => {
                        maxIncidence = Math.max(maxIncidence, dataItem.valueset[ageGroupHeat.getName()].INCIDENCES[ModelConstants.STRAIN_ID___________ALL]);
                        maxInfectious = Math.max(maxInfectious, dataItem.valueset[ageGroupHeat.getName()].INFECTIOUS[ModelConstants.STRAIN_ID___________ALL]);
                    });
                }
            }

            this.yAxisPlotIncidence.min = 0;
            this.yAxisPlotIncidence.max = maxIncidence * 1.05;

            this.yAxisPlotPercent_000_100.min = 0;
            this.yAxisPlotPercent_000_100.max = maxInfectious * 1.05;

            if (this.chartMode === 'INCIDENCE') {
                this.applyMaxHeat(maxIncidence);
            } else {
                this.applyMaxHeat(maxInfectious);
            }

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

        clearTimeout(this.renderTimeout);


        const plotData: any[] = [];
        const heatData: any[] = [];

        const modificationValuesStrain = Modifications.getInstance().findModificationsByType('STRAIN').map(m => m.getModificationValues() as IModificationValuesStrain);
        const modificationsContact = Modifications.getInstance().findModificationsByType('CONTACT').map(m => m as ModificationContact);

        const toRegressionX = (instant: number) => {
            return (instant - ModelInstants.getInstance().getMinInstant()) / (ModelInstants.getInstance().getMaxInstant() - ModelInstants.getInstance().getMinInstant());
        };

        const regressionData :DataPoint[] = [];
        for (let i=modificationsContact.length - 20; i<modificationsContact.length; i++) {
            const modificationContact = modificationsContact[i];
            regressionData.push([
                toRegressionX(modificationContact.getInstant()),
                modificationContact.getCategoryValue(this.categoryName)
            ]);
        }
        var regressionResult = regression.polynomial(regressionData, { order: 3 });
        console.log('regressionResult', regressionResult);
        var regressionEquation = (x: number) => Math.pow(x, 3) * regressionResult.equation[0] + Math.pow(x, 2) * regressionResult.equation[1] + x * regressionResult.equation[2] + regressionResult.equation[3];


        let maxGamma = 0;
        const randomVd = Math.random() * 0.00001;

        const ageGroupPlot = Demographics.getInstance().getAgeGroupsWithTotal()[this.ageGroupIndex];
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
            const ageGroupCasesP = dataItem.valueset[ageGroupPlot.getName()].CASES;

            const regressionX = toRegressionX(dataItem.instant);
            const contactMultiplier = regressionEquation(regressionX); // regressionResult.points.find(p => p[0] > regressionX)?.[1];
            const contactCorrection = modificationsContact.find(m => m.getInstant() === dataItem.instant)?.getCategoryValue(this.categoryName);
            // contactMultiplier = modificationContact.getCategoryValue(this.categoryName);
            // if (this.ageGroupIndex >= 0 && this.ageGroupIndex < Demographics.getInstance().getAgeGroups().length) {
            //     contactCorrection = modificationContact.getCorrectionValue('other', this.ageGroupIndex) / 2;
            // }

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
                ageGroupRemovedVRC,
                ageGroupIncidence,
                ageGroupCasesP,
                contactMultiplier,
                contactCorrection
                // ageGroupCasesN,
            }

            // add one strain value per modification
            modificationValuesStrain.forEach(modificationValueStrain => {
                item[`ageGroupIncidence${modificationValueStrain.id}`] = dataItem.valueset[ageGroupPlot.getName()].INCIDENCES[modificationValueStrain.id];
                item[`ageGroupExposed${modificationValueStrain.id}`] = dataItem.valueset[ageGroupPlot.getName()].EXPOSED[modificationValueStrain.id];
                item[`ageGroupInfectious${modificationValueStrain.id}`] = dataItem.valueset[ageGroupPlot.getName()].INFECTIOUS[modificationValueStrain.id];
            });

            plotData.push(item);

            const dataItem00 = BaseData.getInstance().findBaseDataItem(dataItem.instant);
            Demographics.getInstance().getAgeGroupsWithTotal().forEach(ageGroupHeat => {

                let value = ControlsConstants.HEATMAP_DATA_PARAMS[this.chartMode].getHeatValue(dataItem, ageGroupHeat.getName());
                let label = ControlsConstants.HEATMAP_DATA_PARAMS[this.chartMode].getHeatLabel(value);
                let gamma = Math.pow(value + randomVd, 1 / 1.15); // apply some gamma for better value perception

                let color: string;
                if (QueryUtil.getInstance().isDiffDisplay() && ObjectUtil.isNotEmpty(dataItem00)) {

                    // console.log(dataItem.valueset[ageGroupHeat.getName()].CASES, dataItem00.getAverageCases(ageGroupHeat.getIndex()))

                    const caseValue =  dataItem.valueset[ageGroupHeat.getName()].CASES / dataItem00.getAverageCases(ageGroupHeat.getIndex());

                    let r = 0;
                    let g = 0;
                    let b = 0;
                    if (caseValue >= 1) {
                        g = (caseValue - 1) * 5;
                    }
                    else {
                        r = (1 / caseValue - 1) * 5;
                    }
                    // if (value > 0) {
                    //     g = value / 20;
                    // }
                    // else {
                    //     r = value / -20;
                    // }

                    const rgb = [Math.min(1, r), Math.min(1, g), b];

                    const hsv = [0, 0, 0];
                    ColorUtil.rgbToHsv(rgb, hsv);
                    color = new Color(hsv[0], hsv[1], hsv[2]).getHex();

                    label = caseValue.toLocaleString();
                    // gamma = caseValue;
                    gamma = Math.pow(caseValue + randomVd, 1 / 0.9); // apply some gamma for better value perception
                    // gamma = Math.pow(value + randomVd, 1 / 1.15); // apply some gamma for better value perception

                }

                heatData.push({
                    categoryX: dataItem.categoryX,
                    categoryY: ageGroupHeat.getName(),
                    index: ageGroupHeat.getIndex(),
                    value: value + randomVd,
                    label,
                    color,
                    gamma
                });
                maxGamma = Math.max(maxGamma, gamma);

            });

        }

        const chartData = [...plotData, ...heatData];

        this.applyMaxHeat(maxGamma);

        // console.log('heatData', heatData);

        if (this.chart.data.length === chartData.length && !QueryUtil.getInstance().isDiffDisplay()) {
            for (let i = 0; i < chartData.length; i++) {
                for (const key of Object.keys(chartData[i])) { // const key in chartData[i]
                    this.chart.data[i][key] = chartData[i][key];
                }
            }
            this.chart.invalidateRawData();
        } else {
            this.chart.data = chartData;
            this.renderBaseData();
        }

    }

    async renderBaseData(): Promise<void> {

        const plotData: any[] = [];

        const ageGroupPlot = Demographics.getInstance().getAgeGroupsWithTotal()[this.ageGroupIndex];

        const instantMin = ModelInstants.getInstance().getMinInstant();
        const instantMax = ModelInstants.getInstance().getMaxInstant();
        let incidenceMax = 0;
        for (let instant = instantMin; instant <= instantMax; instant += TimeUtil.MILLISECONDS_PER____DAY) {

            const categoryX = TimeUtil.formatCategoryDate(instant);

            let ageGroupRemovedVR1 = null;
            let ageGroupRemovedVR2 = null;
            let ageGroupIncidenceR = null;
            let ageGroupAverageCasesR: number;
            let ageGroupReproductionR = null;
            let positivityRateR = null;
            let ageGroupCasesR = null;
            const dataItem00 = BaseData.getInstance().findBaseDataItem(instant);
            if (dataItem00) {

                ageGroupRemovedVR1 = dataItem00.getVacc1(ageGroupPlot.getName()) / ageGroupPlot.getAbsValue();
                ageGroupRemovedVR2 = dataItem00.getVacc2(ageGroupPlot.getName()) / ageGroupPlot.getAbsValue();
                ageGroupIncidenceR = dataItem00.getIncidence(ageGroupPlot.getIndex());
                if (ageGroupIncidenceR && !Number.isNaN(ageGroupIncidenceR)) {
                    incidenceMax = Math.max(incidenceMax, ageGroupIncidenceR);
                }

                ageGroupAverageCasesR = dataItem00.getAverageCases(ageGroupPlot.getIndex());
                // const casesBoundary = ContactAdapter.calculateBoundary(ageGroupAverageCasesR);
                // ageGroupAverageCasesRU = casesBoundary.upper;
                // ageGroupAverageCasesRL = casesBoundary.lower;

                ageGroupReproductionR = dataItem00.getReproductionNumber(ageGroupPlot.getIndex()); // dataItem00.getAverageMobilityOther();//
                if (ageGroupReproductionR && !Number.isNaN(ageGroupReproductionR)) {
                    ageGroupReproductionR -= 1;
                }

                ageGroupCasesR = dataItem00.getCasesM1(ageGroupPlot.getIndex());
                positivityRateR = dataItem00.getAveragePositivity();
                if (positivityRateR && !Number.isNaN(positivityRateR)) {
                    positivityRateR *= 10;
                }

            } else {
                // console.log('no data found', categoryX);
            }


            let ageGroupCasesN = ageGroupAverageCasesR && BaseData.getInstance().getAverageOffset(ageGroupPlot.getIndex(), instant);
            if (ageGroupCasesN) {
                ageGroupCasesN *= ageGroupAverageCasesR;
            }
            // console.log(TimeUtil.formatCategoryDate(instant), ageGroupCasesN, ageGroupAverageCasesR);

            const item = {
                categoryX,
                ageGroupRemovedVR1,
                ageGroupRemovedVR2,
                ageGroupIncidenceR,
                ageGroupAverageCasesR,
                ageGroupReproductionR,
                positivityRateR,
                ageGroupCasesR,
                ageGroupCasesN
            }
            plotData.push(item);

        }

        /**
         * chart data must have been set at least once, or this will fail
         */
        for (let i = 0; i < plotData.length; i++) {
            for (const key of Object.keys(plotData[i])) { // const key in chartData[i]
                this.chart.data[i][key] = plotData[i][key];
            }
        }
        this.chart.invalidateRawData();


    }

}

