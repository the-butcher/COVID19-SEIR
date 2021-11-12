import { CategoryAxis, CategoryAxisDataItem, Column, ColumnSeries, LineSeries, StepLineSeries, ValueAxis, XYChart, XYCursor } from "@amcharts/amcharts4/charts";
import { color, Container, create, Label, percent, Rectangle, useTheme } from "@amcharts/amcharts4/core";
import am4themes_animated from '@amcharts/amcharts4/themes/animated';
import am4themes_dark from '@amcharts/amcharts4/themes/dark';
import { IModificationValuesStrain } from '../../common/modification/IModificationValuesStrain';
import { Modifications } from '../../common/modification/Modifications';
import { BaseData } from '../../model/basedata/BaseData';
import { Color } from '../../util/Color';
import { QueryUtil } from '../../util/QueryUtil';
import { StrainUtil } from '../../util/StrainUtil';
import { ControlsRegression } from '../controls/ControlsRegression';
import { CHART_MODE______KEY, ControlsConstants } from '../gui/ControlsConstants';
import { SliderModification } from '../gui/SliderModification';
import { StorageUtil } from '../storage/StorageUtil';
import { Demographics } from './../../common/demographics/Demographics';
import { ModificationRegression } from './../../common/modification/ModificationRegression';
import { ModelConstants } from './../../model/ModelConstants';
import { ModelInstants } from './../../model/ModelInstants';
import { IDataItem } from './../../model/state/ModelStateIntegrator';
import { ColorUtil } from './../../util/ColorUtil';
import { ICoordinate } from './../../util/ICoordinate';
import { ObjectUtil } from './../../util/ObjectUtil';
import { TimeUtil } from './../../util/TimeUtil';
import { ModelActions } from './../gui/ModelActions';
import { ChartAgeGroupSeries } from './ChartAgeGroupSeries';
import { ChartUtil } from './ChartUtil';

export interface IModificationData {
    categoryX: string,
    modValueY: number
}

export interface ISeriesLabels {
    tooltip: boolean;
    pathtip: boolean;
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
     * percentage axis
     */
    protected readonly yAxisPlotPercent: ValueAxis;

    /**
     * incidence axis
     */
    protected readonly yAxisPlotIncidence: ValueAxis;
    protected readonly columnTemplate: Column;

    protected readonly yAxisHeat: CategoryAxis;
    private seriesAgeGroupLabelLocation: number;

    /**
     * primary incidence series (all strains)
     */
    protected readonly seriesAgeGroupIncidence: ChartAgeGroupSeries;
    protected readonly seriesAgeGroupIncidence95U: ChartAgeGroupSeries;
    protected readonly seriesAgeGroupIncidence95L: ChartAgeGroupSeries;
    protected readonly seriesAgeGroupIncidence68U: ChartAgeGroupSeries;
    protected readonly seriesAgeGroupIncidence68L: ChartAgeGroupSeries;

    /**
     * incidence series by strain
     */
    protected readonly seriesAgeGroupIncidenceByStrain: Map<string, ChartAgeGroupSeries>;

    /**
     * visualize multipliers and/or corrections (for readability and plausibility)
     */
    protected readonly seriesContactValue: ChartAgeGroupSeries;
    protected readonly seriesContactValue95U: ChartAgeGroupSeries;
    protected readonly seriesContactValue95L: ChartAgeGroupSeries;
    protected readonly seriesContactValueM: ChartAgeGroupSeries;
    protected readonly seriesContactValueL: ChartAgeGroupSeries;
    protected readonly seriesContactValueLL: ChartAgeGroupSeries;
    protected readonly seriesContactValueLU: ChartAgeGroupSeries;

    protected readonly seriesSeasonality: ChartAgeGroupSeries;

    /**
     * reproduction as calculated
     */
    protected readonly seriesReproductionP: ChartAgeGroupSeries;

    /**
     * reproduction as reported
     */
    protected readonly seriesReproductionR: ChartAgeGroupSeries;

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
    protected readonly seriesAgeGroupRemovedVI: ChartAgeGroupSeries;
    protected readonly seriesAgeGroupRemovedV2: ChartAgeGroupSeries;
    protected readonly seriesAgeGroupRemovedVU: ChartAgeGroupSeries;

    /**
     * real data
     */
    protected readonly seriesAgeGroupRemovedVR1: ChartAgeGroupSeries;
    protected readonly seriesAgeGroupRemovedVR2: ChartAgeGroupSeries;
    protected readonly seriesAgeGroupIncidenceR: ChartAgeGroupSeries; // real incidence
    protected readonly seriesPositivityRateR: ChartAgeGroupSeries; // real test numbers

    private readonly selectedModificationRange: CategoryAxisDataItem;

    /**
     * real average cases
     */
    protected readonly seriesAgeGroupAverageCasesR: ChartAgeGroupSeries;

    protected readonly seriesHeat: ColumnSeries;

    private absValue: number; // the absolute value of the age-group currently displayed
    private ageGroupIndex: number;
    private categoryName: string;
    private modelData: IDataItem[];
    private chartMode: CHART_MODE______KEY;

    private ageGroupMarker: Rectangle;
    private intervalHandle: number;

    private titleContainer: Container;
    private chartTitle: Label;

    private constructor() {

        useTheme(am4themes_dark);
        useTheme(am4themes_animated);

        this.absValue = 0;
        this.ageGroupIndex = -1;
        this.categoryName = 'other';
        this.chartMode = 'INCIDENCE';

        this.chart = create('chartDivAgeGroupPlot', XYChart);

        this.titleContainer = this.chart.chartContainer.createChild(Container);
        this.titleContainer.layout = "absolute";
        this.titleContainer.toBack();
        this.titleContainer.width = percent(100);
        this.titleContainer.paddingBottom = 10;
        this.titleContainer.exportable = true;

        this.chartTitle = this.titleContainer.createChild(Label);
        this.chartTitle.text = '';
        this.chartTitle.fontFamily = ControlsConstants.FONT_FAMILY;
        this.chartTitle.fontSize = ControlsConstants.FONT_SIZE;
        this.chartTitle.fill = color(ControlsConstants.COLOR____FONT);
        this.chartTitle.exportable = true;

        let dateTitle = this.titleContainer.createChild(Label);
        dateTitle.text = `@FleischerHannes, ${TimeUtil.formatCategoryDateFull(Date.now())} - data: ages, bmsgpk, google`;
        dateTitle.align = "right";
        dateTitle.dy = 2;
        dateTitle.fontFamily = ControlsConstants.FONT_FAMILY;
        dateTitle.fontSize = ControlsConstants.FONT_SIZE - 2;
        dateTitle.fill = color(ControlsConstants.COLOR____FONT);
        dateTitle.exportable = true;

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

        /**
         * marker line to indicate the currently selected modification on the modification slider
         */
        this.selectedModificationRange = this.xAxis.axisRanges.create();
        this.selectedModificationRange.label.visible = false;
        this.selectedModificationRange.grid.fillOpacity = 0.00;
        this.selectedModificationRange.grid.strokeOpacity = 0.75;
        this.selectedModificationRange.grid.strokeWidth = 0.75
        this.selectedModificationRange.grid.strokeDasharray = '2, 2';
        this.selectedModificationRange.grid.stroke = color(ControlsConstants.COLOR____FONT).brighten(-0.4);

        this.yAxisPlotAbsolute = this.chart.yAxes.push(new ValueAxis());
        ChartUtil.getInstance().configureAxis(this.yAxisPlotAbsolute, 'population');
        this.yAxisPlotAbsolute.tooltip.exportable = false;
        this.yAxisPlotAbsolute.rangeChangeDuration = 0;
        this.yAxisPlotAbsolute.strictMinMax = true;
        this.yAxisPlotAbsolute.visible = false;
        this.yAxisPlotAbsolute.renderer.grid.template.disabled = true;
        this.yAxisPlotAbsolute.tooltip.disabled = true;

        this.yAxisPlotPercent = this.chart.yAxes.push(new ValueAxis());
        ChartUtil.getInstance().configureAxis(this.yAxisPlotPercent, 'Population %');
        this.yAxisPlotPercent.tooltip.exportable = false;
        this.yAxisPlotPercent.visible = false;
        this.yAxisPlotPercent.renderer.grid.template.disabled = true;
        this.yAxisPlotPercent.rangeChangeDuration = 0;
        this.yAxisPlotPercent.strictMinMax = true;
        this.yAxisPlotPercent.min = 0.00;
        this.yAxisPlotPercent.max = 1.00;

        this.yAxisPlotPercent.renderer.labels.template.adapter.add('text', (value, target) => {
            return ChartUtil.getInstance().formatLabelOrTooltipValue(value, this.yAxisPlotPercent.max >= 1 ? ControlsConstants.LABEL_PERCENT___FIXED : ControlsConstants.LABEL_PERCENT__FLOAT_2);
        });
        this.yAxisPlotPercent.tooltip.label.adapter.add('text', (value, target) => {
            return ChartUtil.getInstance().formatLabelOrTooltipValue(value, this.yAxisPlotPercent.max >= 1 ? ControlsConstants.LABEL_PERCENT___FIXED : ControlsConstants.LABEL_PERCENT__FLOAT_2);
        });

        // incidence axis
        this.yAxisPlotIncidence = this.chart.yAxes.push(new ValueAxis());
        this.yAxisPlotIncidence.rangeChangeDuration = 0;
        this.yAxisPlotIncidence.strictMinMax = true;
        ChartUtil.getInstance().configureAxis(this.yAxisPlotIncidence, '7-day incidence / ' + (100000).toLocaleString());
        this.yAxisPlotIncidence.tooltip.exportable = false;

        this.seriesAgeGroupIncidence95L = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotIncidence,
            title: 'incidence (CI95)',
            baseLabel: 'incidence (CI95)',
            valueField: 'ageGroupIncidence95L',
            colorKey: 'CASES',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.10,
            labels: {
                tooltip: false,
                pathtip: false
            },
            stacked: false,
            legend: false,
            labellingDefinition: ControlsConstants.LABEL_ABSOLUTE_FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });
        this.seriesAgeGroupIncidence95L.getSeries().strokeOpacity = 0.5;
        this.seriesAgeGroupIncidence95U = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotIncidence,
            title: 'incidence (CI95)',
            baseLabel: 'CI 95%',
            valueField: 'ageGroupIncidence95U',
            colorKey: 'CASES',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.10,
            labels: {
                tooltip: false,
                pathtip: false
            },
            stacked: true,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_ABSOLUTE_FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });
        this.seriesAgeGroupIncidence95U.getSeries().strokeOpacity = 0.5;
        this.seriesAgeGroupIncidence95U.getSeries().fillOpacity = 0.2;
        this.seriesAgeGroupIncidence95U.bindToLegend(this.seriesAgeGroupIncidence95L);

        this.seriesAgeGroupIncidence68L = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotIncidence,
            title: 'incidence (CI68)',
            baseLabel: 'incidence (CI68)',
            valueField: 'ageGroupIncidence68L',
            colorKey: 'CASES',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.10,
            labels: {
                tooltip: false,
                pathtip: false
            },
            stacked: false,
            legend: false,
            labellingDefinition: ControlsConstants.LABEL_ABSOLUTE_FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });
        this.seriesAgeGroupIncidence68L.getSeries().strokeOpacity = 0.5;
        this.seriesAgeGroupIncidence68U = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotIncidence,
            title: 'incidence (CI68)',
            baseLabel: 'CI 68%',
            valueField: 'ageGroupIncidence68U',
            colorKey: 'CASES',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.10,
            labels: {
                tooltip: false,
                pathtip: false
            },
            stacked: true,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_ABSOLUTE_FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });
        this.seriesAgeGroupIncidence68U.getSeries().strokeOpacity = 0.5;
        this.seriesAgeGroupIncidence68U.getSeries().fillOpacity = 0.2;
        this.seriesAgeGroupIncidence68U.bindToLegend(this.seriesAgeGroupIncidence68L);


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
            labels: {
                tooltip: true,
                pathtip: true
            },
            stacked: false,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_ABSOLUTE_FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });
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
            labels: {
                tooltip: true,
                pathtip: true
            },
            stacked: false,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_ABSOLUTE_FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });

        this.seriesAgeGroupCasesN = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotAbsolute,
            title: 'daily cases (model)',
            baseLabel: 'daily cases (model)',
            valueField: 'ageGroupCasesN',
            colorKey: 'SEASONALITY',
            strokeWidth: 0.5,
            dashed: false,
            locationOnPath: 1.10,
            labels: {
                tooltip: true,
                pathtip: false
            },
            stacked: false,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_ABSOLUTE_FIXED,
            seriesConstructor: () => new StepLineSeries()
        });

        this.seriesAgeGroupCasesR = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotAbsolute,
            title: 'cases (ages)',
            baseLabel: 'cases (ages)' ,
            valueField: 'ageGroupCasesR',
            colorKey: 'CASES',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.90,
            labels: {
                tooltip: true,
                pathtip: false
            },
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
            locationOnPath: 0.8,
            labels: {
                tooltip: true,
                pathtip: true
            },
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
            labels: {
                tooltip: true,
                pathtip: true
            },
            stacked: false,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_ABSOLUTE_FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });
        this.seriesAgeGroupIncidenceR.getSeries().tooltip.exportable = false;



        this.seriesAgeGroupIncidenceByStrain = new Map();

        this.seriesAgeGroupRemovedV2 = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent,
            title: 'vaccinated',
            baseLabel: 'vaccinated, full',
            valueField: 'ageGroupRemovedV2',
            colorKey: 'VACCINATION',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.15,
            labels: {
                tooltip: true,
                pathtip: true
            },
            stacked: true,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });
        this.seriesAgeGroupRemovedVU = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent,
            title: 'vaccinated, after asymptomatic infection',
            baseLabel: 'vaccinated, after asymptomatic infection',
            valueField: 'ageGroupRemovedVU',
            colorKey: 'VACCINATION',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.25,
            labels: {
                tooltip: true,
                pathtip: true
            },
            stacked: true,
            legend: false,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });


        this.seriesAgeGroupRemovedVI = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent,
            title: 'immunizing',
            baseLabel: 'immunizing',
            valueField: 'ageGroupRemovedVI',
            colorKey: 'IMMUNIZING',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.1,
            labels: {
                tooltip: true,
                pathtip: true
            },
            stacked: true,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });


        /**
         * recovered after known infection
         */
        this.seriesAgeGroupRemovedID = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent,
            title: 'recovered',
            baseLabel: 'recovered after symptomatic infection',
            valueField: 'ageGroupRemovedID',
            colorKey: 'REMOVED',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.1,
            labels: {
                tooltip: true,
                pathtip: true
            },
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
            yAxis: this.yAxisPlotPercent,
            title: 'recovered',
            baseLabel: 'recovered after asymptomatic infection',
            valueField: 'ageGroupRemovedIU',
            colorKey: 'REMOVED',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.1,
            labels: {
                tooltip: true,
                pathtip: true
            },
            stacked: true,
            legend: false,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });
        this.seriesAgeGroupRemovedID.bindToLegend(this.seriesAgeGroupRemovedIU);
        this.seriesAgeGroupRemovedID.bindToLegend(this.seriesAgeGroupRemovedVU);

        this.seriesAgeGroupSusceptible = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent,
            title: 'susceptible',
            baseLabel: 'susceptible',
            valueField: 'ageGroupSusceptible',
            colorKey: 'SUSCEPTIBLE',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.05,
            labels: {
                tooltip: true,
                pathtip: true
            },
            stacked: true,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });
        this.seriesAgeGroupSusceptible.bindToLegend(this.seriesAgeGroupRemovedVI);

        this.seriesAgeGroupExposed = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent,
            title: 'exposed',
            baseLabel: 'exposed',
            valueField: 'ageGroupExposed',
            colorKey: 'EXPOSED',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.25,
            labels: {
                tooltip: true,
                pathtip: true
            },
            stacked: true,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2_ABS,
            seriesConstructor: () => new LineSeries()
        });
        this.seriesAgeGroupInfectious = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent,
            title: 'infectious',
            baseLabel: 'infectious',
            valueField: 'ageGroupInfectious',
            colorKey: 'INFECTIOUS',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.75,
            labels: {
                tooltip: true,
                pathtip: true
            },
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
            yAxis: this.yAxisPlotPercent,
            title: 'vaccinated',
            baseLabel: 'vaccinated, partial (ages)',
            valueField: 'ageGroupRemovedVR1',
            colorKey: 'SEASONALITY',
            strokeWidth: 1,
            dashed: true,
            locationOnPath: 0.00,
            labels: {
                tooltip: false,
                pathtip: false
            },
            stacked: false,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });
        this.seriesAgeGroupRemovedVR2 = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent,
            title: 'vaccinated',
            baseLabel: 'vaccinated, full (ages)',
            valueField: 'ageGroupRemovedVR2',
            colorKey: 'SEASONALITY',
            strokeWidth: 1,
            dashed: true,
            locationOnPath: 0.00,
            labels: {
                tooltip: false,
                pathtip: false
            },
            stacked: false,
            legend: false,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });
        this.seriesAgeGroupRemovedVR1.bindToLegend(this.seriesAgeGroupRemovedVR2);


        this.seriesPositivityRateR = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent,
            title: 'positivity rate',
            baseLabel: 'positivity rate',
            valueField: 'positivityRateR',
            colorKey: 'TESTING',
            strokeWidth: 2,
            dashed: false,
            locationOnPath: 0.35,
            labels: {
                tooltip: true,
                pathtip: true
            },
            stacked: false,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_ABSOLUTE_FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });

        this.seriesSeasonality = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent,
            title: 'seasonality',
            baseLabel: 'seasonality',
            valueField: 'seasonality',
            colorKey: 'SEASONALITY',
            strokeWidth: 30,
            dashed: false,
            locationOnPath: 0.20,
            labels: {
                tooltip: true,
                pathtip: true
            },
            stacked: false,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });
        this.seriesSeasonality.setSeriesNote('');
        this.seriesSeasonality.getSeries().strokeOpacity = 0.1;

        this.seriesReproductionP = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent,
            title: 'reproduction (model)',
            baseLabel: 'reproduction (model)',
            valueField: 'reproductionP',
            colorKey: 'STRAIN',
            strokeWidth: 2,
            dashed: false,
            locationOnPath: 0.20,
            labels: {
                tooltip: true,
                pathtip: true
            },
            stacked: false,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_ABSOLUTE_FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });

        this.seriesReproductionR = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent,
            title: 'reproduction (ages)',
            baseLabel: 'reproduction (ages)',
            valueField: 'reproductionR',
            colorKey: 'STRAIN',
            strokeWidth: 1,
            dashed: true,
            locationOnPath: 0.50,
            labels: {
                tooltip: true,
                pathtip: true
            },
            stacked: false,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_ABSOLUTE_FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });

        this.seriesContactValue = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent,
            title: 'contact estimation',
            baseLabel: 'contact estimation',
            valueField: 'contactValue',
            colorKey: 'SEASONALITY',
            strokeWidth: 1,
            dashed: true,
            locationOnPath: 0.80,
            labels: {
                tooltip: true,
                pathtip: true
            },
            stacked: false,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });
        this.seriesContactValue95L = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent,
            title: 'contact estimation',
            baseLabel: 'contact estimation',
            valueField: 'contactValue95L',
            colorKey: 'SEASONALITY',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.20,
            labels: {
                tooltip: false,
                pathtip: false
            },
            stacked: false,
            legend: false,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });
        this.seriesContactValue95L.getSeries().strokeOpacity = 0.5;
        this.seriesContactValue.bindToLegend(this.seriesContactValue95L);
        this.seriesContactValue95U = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent,
            title: 'contact estimation',
            baseLabel: 'contact estimation',
            valueField: 'contactValue95U',
            colorKey: 'SEASONALITY',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.20,
            labels: {
                tooltip: false,
                pathtip: false
            },
            stacked: true,
            legend: false,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });
        this.seriesContactValue95U.getSeries().strokeOpacity = 0.5;
        this.seriesContactValue95U.getSeries().fillOpacity = 0.2;
        this.seriesContactValue.bindToLegend(this.seriesContactValue95U);

        this.seriesContactValueM = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent,
            title: 'contact settings',
            baseLabel: 'contact settings',
            valueField: 'contactValueM',
            colorKey: 'CASES',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.40,
            labels: {
                tooltip: true,
                pathtip: true
            },
            stacked: false,
            legend: false,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });

        this.seriesContactValueL = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent,
            title: 'contact smoothed',
            baseLabel: 'contact smoothed',
            valueField: 'contactValueL',
            colorKey: 'CASES',
            strokeWidth: 2,
            dashed: false,
            locationOnPath: 0.40,
            labels: {
                tooltip: true,
                pathtip: true
            },
            stacked: false,
            legend: false,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });
        this.seriesContactValueLL = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent,
            title: 'contact loess off',
            baseLabel: 'contact loess off',
            valueField: 'contactValueLL',
            colorKey: 'CASES',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.20,
            labels: {
                tooltip: false,
                pathtip: false
            },
            stacked: false,
            legend: false,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });
        this.seriesContactValueLL.getSeries().strokeOpacity = 0.5;
        this.seriesContactValue.bindToLegend(this.seriesContactValueLL);
        this.seriesContactValueLU = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent,
            title: 'contact loess off',
            baseLabel: 'contact loess off',
            valueField: 'contactValueLU',
            colorKey: 'CASES',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.20,
            labels: {
                tooltip: false,
                pathtip: false
            },
            stacked: true,
            legend: false,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });
        this.seriesContactValueLU.getSeries().strokeOpacity = 0.5;
        this.seriesContactValueLU.getSeries().fillOpacity = 0.2;
        this.seriesContactValue.bindToLegend(this.seriesContactValueLU);

        this.chart.cursor = new XYCursor();
        this.chart.cursor.xAxis = this.xAxis;
        this.chart.cursor.showTooltipOn = 'always';
        this.chart.cursor.exportable = true;
        this.chart.cursor.maxTooltipDistance = 12;
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
        // this.chart.zoomOutButton.dy = 30;
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
        this.columnTemplate.width = percent(100);
        this.columnTemplate.height = percent(100);
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
            const minInstant = TimeUtil.parseCategoryDateFull(minCategory);
            const maxInstant = TimeUtil.parseCategoryDateFull(maxCategory);

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

            const pixelHeightPlot = this.chart.leftAxesContainer.pixelHeight - pixelHeightHeat - pixelMargin;

            const pixelPosPlot = 0;
            const pixelPosHeat = pixelPosPlot + pixelHeightPlot + pixelMargin;

            this.yAxisPlotAbsolute.y = percent(pixelPosPlot * pp);
            this.yAxisPlotPercent.y = percent(pixelPosPlot * pp);
            this.yAxisPlotIncidence.y = percent(pixelPosPlot * pp);
            this.yAxisHeat.y = percent(pixelPosHeat * pp);

            this.yAxisPlotAbsolute.height = percent(pixelHeightPlot * pp);
            this.yAxisPlotPercent.height = percent(pixelHeightPlot * pp);
            this.yAxisPlotIncidence.height = percent(pixelHeightPlot * pp);

            this.yAxisHeat.height = percent(pixelHeightHeat * pp);

            const offsetX = this.chart.plotContainer.pixelX + this.xAxis.pixelX;
            this.chartTitle.x = offsetX;

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

        document.addEventListener('keyup', e => {
            if (e.key === 'x') {
                this.exportToPng();
            }
        });

        // this.setChartMode('INCIDENCE');

    }

    getAgeGroupName(): string {
        return Demographics.getInstance().getAgeGroupsWithTotal()[this.getAgeGroupIndex()].getName()
    }

    getAgeGroupIndex(): number {
        return this.ageGroupIndex >= 0 ? this.ageGroupIndex : Demographics.getInstance().getAgeGroups().length;
    }

    getAbsValue(): number {
        return this.absValue;
    }

    setInstant(instant: number): void {
        const point = this.xAxis.anyToPoint(TimeUtil.formatCategoryDateFull(instant));
        this.chart.cursor.triggerMove(point, 'soft'); // https://www.amcharts.com/docs/v4/tutorials/sticky-chart-cursor/
    }

    async exportToPng(): Promise<void> {
        this.chart.exporting.export("png");
    }

    exportToJson(): void {
        StorageUtil.getInstance().exportJson(this.modelData);
    }

    async setAgeGroupIndex(ageGroupIndex: number): Promise<void> {

        const requiresBaseDataRender = this.ageGroupIndex !== ageGroupIndex;
        const requiresRegressionData = this.getChartMode() === 'CONTACT';

        this.ageGroupIndex = ageGroupIndex;
        this.updateTitle();

        const ageGroup = Demographics.getInstance().getAgeGroupsWithTotal()[this.ageGroupIndex];
        this.absValue = ageGroup.getAbsValue();

        if (ObjectUtil.isNotEmpty(this.modelData)) {

            if (requiresBaseDataRender) {
                this.renderBaseData();
            }
            if (requiresRegressionData) {
                this.renderRegressionData();
            }
            this.requestRenderModelData();

            // wait for the series heat to be ready, then place marker
            clearInterval(this.intervalHandle);
            this.intervalHandle = window.setInterval(() => {
                if (this.seriesHeat.columns.length > 0) {

                    const templateColumn = this.seriesHeat.columns.getIndex(0);

                    const minX = this.xAxis.categoryToPoint(TimeUtil.formatCategoryDateFull(SliderModification.getInstance().getMinValue())).x - templateColumn.realWidth / 2;
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

        }

        this.seriesAgeGroupIncidence.setSeriesNote(ageGroup.getName());
        this.seriesAgeGroupIncidence95L.setSeriesNote(ageGroup.getName());
        this.seriesAgeGroupIncidence95U.setSeriesNote(ageGroup.getName());
        this.seriesAgeGroupIncidence68L.setSeriesNote(ageGroup.getName());
        this.seriesAgeGroupIncidence68U.setSeriesNote(ageGroup.getName());

        this.seriesAgeGroupIncidenceR.setSeriesNote(ageGroup.getName());

        this.seriesAgeGroupAverageCasesR.setSeriesNote(ageGroup.getName());

        this.seriesAgeGroupCasesP.setSeriesNote(ageGroup.getName());
        this.seriesAgeGroupCasesN.setSeriesNote(ageGroup.getName());
        this.seriesAgeGroupCasesR.setSeriesNote(ageGroup.getName());
        this.seriesPositivityRateR.setSeriesNote(ModelConstants.AGEGROUP_NAME_______ALL);

        this.seriesAgeGroupSusceptible.setSeriesNote(ageGroup.getName());
        this.seriesAgeGroupExposed.setSeriesNote(ageGroup.getName());
        this.seriesAgeGroupInfectious.setSeriesNote(ageGroup.getName());
        this.seriesAgeGroupRemovedID.setSeriesNote(ageGroup.getName());
        this.seriesAgeGroupRemovedIU.setSeriesNote(ageGroup.getName());
        this.seriesAgeGroupRemovedVI.setSeriesNote(ageGroup.getName());
        this.seriesAgeGroupRemovedV2.setSeriesNote(ageGroup.getName());
        this.seriesAgeGroupRemovedVU.setSeriesNote(ageGroup.getName());
        this.seriesAgeGroupRemovedVR1.setSeriesNote(ageGroup.getName());
        this.seriesAgeGroupRemovedVR2.setSeriesNote(ageGroup.getName());

        this.seriesContactValue.setSeriesNote(ageGroup.getName());
        this.seriesContactValue95L.setSeriesNote(ageGroup.getName());
        this.seriesContactValue95U.setSeriesNote(ageGroup.getName());
        this.seriesContactValueM.setSeriesNote(ageGroup.getName());
        this.seriesContactValueL.setSeriesNote(ageGroup.getName());
        this.seriesContactValueLL.setSeriesNote(ageGroup.getName());
        this.seriesContactValueLU.setSeriesNote(ageGroup.getName());

        this.seriesReproductionP.setSeriesNote(ageGroup.getName());
        this.seriesReproductionR.setSeriesNote(ageGroup.getName());

    }

    async setContactCategory(categoryName: string): Promise<void> {

        this.categoryName = categoryName;

        this.seriesContactValue.setSeriesNote(this.categoryName);
        this.seriesContactValue95L.setSeriesNote(this.categoryName);
        this.seriesContactValue95U.setSeriesNote(this.categoryName);
        this.seriesContactValueM.setSeriesNote(this.categoryName);
        this.seriesContactValueL.setSeriesNote(this.categoryName);
        this.seriesContactValueLL.setSeriesNote(this.categoryName);
        this.seriesContactValueLU.setSeriesNote(this.categoryName);

        if (this.getChartMode() === 'CONTACT') {
            this.renderRegressionData();
        }

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
            range.category = TimeUtil.formatCategoryDateFull(instant);
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
        const offsetY = containerBounds.top + this.chart.pixelPaddingTop + this.chart.plotContainer.pixelY + this.yAxisPlotPercent.pixelY;

        const offsetCoordinate = {
            x: documentCoordinate.x - offsetX,
            y: documentCoordinate.y - offsetY
        }

        const minInstant = ModelInstants.getInstance().getMinInstant();
        const maxInstant = ModelInstants.getInstance().getMaxInstant();

        const minCategoryX = TimeUtil.formatCategoryDateFull(minInstant);
        const maxCategoryX = TimeUtil.formatCategoryDateFull(maxInstant);
        const minPointX =  this.xAxis.categoryToPoint(minCategoryX).x;
        const maxPointX =  this.xAxis.categoryToPoint(maxCategoryX).x;
        const fctPointX = (offsetCoordinate.x - minPointX) / (maxPointX - minPointX);
        const vacPointX = minInstant + (maxInstant - minInstant) * fctPointX;

        // round to closest midnight
        const valueX = Math.round(vacPointX / TimeUtil.MILLISECONDS_PER____DAY) * TimeUtil.MILLISECONDS_PER____DAY;

        const positionY =  this.yAxisPlotPercent.pointToPosition(offsetCoordinate);
        const valueY = this.yAxisPlotPercent.positionToValue(positionY);

        return {
            x: valueX,
            y: valueY
        }

    }

    toDocumentCoordinate(vaccinationCoordinate: ICoordinate): ICoordinate {

        const containerBounds = document.getElementById('chartDivAgeGroupPlot').getBoundingClientRect();

        const offsetX = containerBounds.left + this.chart.pixelPaddingLeft + this.chart.plotContainer.pixelX + this.xAxis.pixelX;
        const offsetY = containerBounds.top + this.chart.pixelPaddingTop + this.chart.plotContainer.pixelY + this.yAxisPlotPercent.pixelY;

        const minCategoryX = TimeUtil.formatCategoryDateFull(ModelInstants.getInstance().getMinInstant());
        const maxCategoryX = TimeUtil.formatCategoryDateFull(ModelInstants.getInstance().getMaxInstant());
        const minPointX =  this.xAxis.categoryToPoint(minCategoryX).x;
        const maxPointX =  this.xAxis.categoryToPoint(maxCategoryX).x;
        const fctPointX = (vaccinationCoordinate.x - ModelInstants.getInstance().getMinInstant()) / (ModelInstants.getInstance().getMaxInstant() - ModelInstants.getInstance().getMinInstant());

        const pointX = minPointX + (maxPointX - minPointX) * fctPointX;
        const pointY = this.yAxisPlotPercent.valueToPoint(vaccinationCoordinate.y).y;

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
                labels: {
                    tooltip: false,
                    pathtip: false
                },
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

        this.yAxisPlotPercent.visible = visible;
        this.yAxisPlotPercent.renderer.grid.template.disabled = !visible;
        this.yAxisPlotPercent.tooltip.disabled = !visible;


        this.seriesAgeGroupSusceptible.setVisible(visible);
        this.seriesAgeGroupRemovedID.setVisible(visible);
        this.seriesAgeGroupRemovedIU.setVisible(visible);

        this.seriesAgeGroupRemovedVI.setVisible(visible);
        this.seriesAgeGroupRemovedV2.setVisible(visible);
        this.seriesAgeGroupRemovedVU.setVisible(visible);
        this.seriesAgeGroupRemovedVR1.setVisible(visible);
        this.seriesAgeGroupRemovedVR2.setVisible(visible);

    }

    setSeriesEIVisible(visible: boolean, stacked: boolean): void {

        this.yAxisPlotPercent.visible = visible;
        this.yAxisPlotPercent.renderer.grid.template.disabled = !visible;
        this.yAxisPlotPercent.tooltip.disabled = !visible;

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
        this.seriesAgeGroupIncidence95L.setVisible(visible);
        this.seriesAgeGroupIncidence95U.setVisible(visible);
        this.seriesAgeGroupIncidence68L.setVisible(visible);
        this.seriesAgeGroupIncidence68U.setVisible(visible);

        this.seriesAgeGroupIncidenceR.setVisible(visible); // visible

        this.seriesAgeGroupAverageCasesR.setVisible(visible);

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

    updateModificationInstant(instant: number): void {
        this.selectedModificationRange.category = TimeUtil.formatCategoryDateFull(instant);
    }

    setSeriesContactVisible(visible: boolean): void {

        this.yAxisPlotPercent.visible = visible;
        this.yAxisPlotPercent.renderer.grid.template.disabled = !visible;
        this.yAxisPlotPercent.tooltip.disabled = !visible;

        this.seriesContactValue.setVisible(visible);
        this.seriesContactValue95L.setVisible(visible);
        this.seriesContactValue95U.setVisible(visible);
        this.seriesContactValueM.setVisible(visible);
        this.seriesContactValueL.setVisible(visible);
        this.seriesContactValueLL.setVisible(visible);
        this.seriesContactValueLU.setVisible(visible);

    }

    setSeriesReproductionVisible(visible: boolean): void {

        this.yAxisPlotPercent.visible = visible;
        this.yAxisPlotPercent.renderer.grid.template.disabled = !visible;
        this.yAxisPlotPercent.tooltip.disabled = !visible;
        this.setAxisPercentBounds(0, 2);

        this.seriesReproductionP.setVisible(visible);
        this.seriesReproductionR.setVisible(visible);
        this.seriesSeasonality.setVisible(visible);

    }

    setSeriesTestingVisible(visible: boolean): void {
        this.seriesPositivityRateR.setVisible(visible);
    }

    setChartMode(chartMode: CHART_MODE______KEY): void {
        this.chartMode = chartMode;
        ControlsConstants.HEATMAP_DATA_PARAMS[this.chartMode].visitChart(this);
        this.updateTitle();
        if (chartMode === 'CONTACT') {
            this.renderRegressionData();
        }
        this.requestRenderModelData();
    }

    private updateTitle(): void {
        this.chartTitle.text = `${ControlsConstants.HEATMAP_DATA_PARAMS[this.chartMode].title} [font-size: 12px](age: ${this.getAgeGroupName()})[/]`;
    }

    getChartMode(): CHART_MODE______KEY {
        return this.chartMode;
    }

    setAxisPercentBounds(min: number, max: number): void {
        this.yAxisPlotPercent.min = -0.1; // min;
        this.yAxisPlotPercent.max = max;
    }


    findDataItemByInstant(instant: number): IDataItem {
        if (ObjectUtil.isNotEmpty(this.modelData)) {
            return this.findDataItemByCategory(TimeUtil.formatCategoryDateFull(instant));
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

        this.requestRenderModelData();

    }

    applyMaxYAxisValue(): void {

        if (ObjectUtil.isNotEmpty(this.modelData) && this.chartMode === 'INCIDENCE') {

            const minCategory = this.xAxis.positionToCategory(this.xAxis.start);
            const maxCategory = this.xAxis.positionToCategory(this.xAxis.end);
            const minInstant = TimeUtil.parseCategoryDateFull(minCategory); // this.findDataItemByCategory(minCategory).instant;
            const maxInstant = TimeUtil.parseCategoryDateFull(maxCategory);



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
            this.yAxisPlotIncidence.max = 1500; // maxIncidence * 1.25;

            this.yAxisPlotPercent.min = 0;
            this.yAxisPlotPercent.max = maxInfectious * 1.00;

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

    // calculateRt(instant: number, modificationValuesStrain: IModificationValuesStrain[]): number {

    //     const _ageGroupIndex = this.getAgeGroupIndex();

    //     const instantA = instant - TimeUtil.MILLISECONDS_PER____DAY * 2;
    //     const instantB = instant + TimeUtil.MILLISECONDS_PER____DAY * 2;
    //     const dataItemA = this.findDataItemByInstant(instantA);
    //     const dataItemB = this.findDataItemByInstant(instantB);

    //     const ageGroupName = Demographics.getInstance().getAgeGroupsWithTotal()[_ageGroupIndex].getName();

    //     if (dataItemA && dataItemB) {

    //         // https://en.wikipedia.org/wiki/Basic_reproduction_number;

    //         const exposedAllStrains = dataItemA.valueset[ageGroupName].EXPOSED[ModelConstants.STRAIN_ID___________ALL];
    //         let rT = 0;

    //         for (let strainIndex = 0; strainIndex < modificationValuesStrain.length; strainIndex++) {

    //             const modificationStrain = modificationValuesStrain[strainIndex];
    //             const exposedStrainA = dataItemA.valueset[ageGroupName].EXPOSED[modificationStrain.id];
    //             const exposedStrainB = dataItemB.valueset[ageGroupName].EXPOSED[modificationStrain.id];
    //             const shareOfStrain = exposedStrainA / exposedAllStrains;

    //             // const growthRate = (exposedStrainNxt / exposedStrainCur) - 1;
    //             // rT += Math.pow(Math.E, growthRate * modificationStrain.getSerialInterval()) * shareOfStrain;

    //             rT += StrainUtil.calculateR0(exposedStrainA, exposedStrainB, instantA, instantB, modificationStrain.serialInterval) * shareOfStrain;

    //             // console.log(new Date(instant), modificationStrain.getName(), shareOfStrain)

    //         }

    //         return rT; // * dataItemCur.valueset[ModelConstants.AGEGROUP_NAME_ALL].SUSCEPTIBLE; // / threshold;

    //     }

    //     return Number.NaN;

    // }

    calculateRt(instant: number, modificationValuesStrain: IModificationValuesStrain[]): number {

        const _ageGroupIndex = this.getAgeGroupIndex();
        const ageGroupName = Demographics.getInstance().getAgeGroupsWithTotal()[_ageGroupIndex].getName();


        const instantA = instant - TimeUtil.MILLISECONDS_PER____DAY * 2;
        const instantB = instant + TimeUtil.MILLISECONDS_PER____DAY * 2;
        const dataItemM2 = this.findDataItemByInstant(instantA);
        const dataItemP2 = this.findDataItemByInstant(instantB);

        if (dataItemM2 && dataItemP2) {

            const averageCasesM2 = dataItemM2.valueset[ageGroupName].CASES;
            const averageCasesP2 = dataItemP2.valueset[ageGroupName].CASES;
            return StrainUtil.calculateR0(averageCasesM2, averageCasesP2, dataItemM2.instant, dataItemP2.instant, 4);

        }

    }

    async renderRegressionData(): Promise<void> {

        const plotData: any[] = [];
        for (const dataItem of this.modelData) {

            const renderableRegressionResult = ControlsRegression.getInstance().getRenderableRegressionResult(dataItem.instant);

            const contactValue = renderableRegressionResult.regression;
            const contactValue95L = renderableRegressionResult.ci95Min;
            const contactValue95U = renderableRegressionResult.ci95Max && renderableRegressionResult.ci95Max - renderableRegressionResult.ci95Min;

            const contactValueM = renderableRegressionResult.loess && renderableRegressionResult.loess.m;

            const contactValueL = renderableRegressionResult.loess && renderableRegressionResult.loess.y;
            const contactValueLL = renderableRegressionResult.loess && renderableRegressionResult.loess.o && renderableRegressionResult.loess.y - renderableRegressionResult.loess.o;
            const contactValueLU = renderableRegressionResult.loess && renderableRegressionResult.loess.o && 2 * renderableRegressionResult.loess.o;

            const item = {
                categoryX: dataItem.categoryX,
                contactValue,
                contactValue95L,
                contactValue95U,
                contactValueM,
                contactValueL,
                contactValueLL,
                contactValueLU
            }

            plotData.push(item);

        }

        const chartData = [...plotData];

        this.seriesContactValue.getSeries().data = chartData;
        this.seriesContactValue95L.getSeries().data = chartData;
        this.seriesContactValue95U.getSeries().data = chartData;
        this.seriesContactValueM.getSeries().data = chartData;
        this.seriesContactValueL.getSeries().data = chartData;
        this.seriesContactValueLL.getSeries().data = chartData;
        this.seriesContactValueLU.getSeries().data = chartData;

    }

    async renderModelData(): Promise<void> {

        clearTimeout(this.renderTimeout);

        const _ageGroupIndex = this.getAgeGroupIndex();

        const plotData: any[] = [];
        const heatData: any[] = [];

        const modificationValuesStrain = Modifications.getInstance().findModificationsByType('STRAIN').map(m => m.getModificationValues() as IModificationValuesStrain);

        let maxGamma = 0;
        const randomVd = Math.random() * 0.00001;

        // console.log('modelData', this.modelData);

        const ageGroupPlot = Demographics.getInstance().getAgeGroupsWithTotal()[_ageGroupIndex];
        for (const dataItem of this.modelData) {

            // data independent from sub-strains
            const ageGroupSusceptible = dataItem.valueset[ageGroupPlot.getName()].SUSCEPTIBLE;
            const ageGroupExposed = dataItem.valueset[ageGroupPlot.getName()].EXPOSED[ModelConstants.STRAIN_ID___________ALL];;
            const ageGroupInfectious = dataItem.valueset[ageGroupPlot.getName()].INFECTIOUS[ModelConstants.STRAIN_ID___________ALL];
            const ageGroupRemovedID = dataItem.valueset[ageGroupPlot.getName()].REMOVED_ID;
            const ageGroupRemovedIU = dataItem.valueset[ageGroupPlot.getName()].REMOVED_IU;
            const ageGroupRemovedVI = dataItem.valueset[ageGroupPlot.getName()].REMOVED_VI;
            const ageGroupRemovedVU = dataItem.valueset[ageGroupPlot.getName()].REMOVED_VU;
            const ageGroupRemovedV2 = dataItem.valueset[ageGroupPlot.getName()].REMOVED_V2;
            const ageGroupIncidence = dataItem.valueset[ageGroupPlot.getName()].INCIDENCES[ModelConstants.STRAIN_ID___________ALL];
            const ageGroupCasesP = dataItem.valueset[ageGroupPlot.getName()].CASES;

            let ageGroupCasesN = ageGroupCasesP && BaseData.getInstance().getAverageOffset(ageGroupPlot.getIndex(), dataItem.instant);
            if (ageGroupCasesN) {
                ageGroupCasesN *= ageGroupCasesP;
            }

            const seasonality = dataItem.seasonality * 1.3;
            const reproductionP = this.calculateRt(dataItem.instant, modificationValuesStrain);

            let ageGroupIncidence95L: number;
            let ageGroupIncidence95U: number;
            let ageGroupIncidence68L: number;
            let ageGroupIncidence68U: number;
            if (dataItem.valueset[ageGroupPlot.getName()].PREDICTION) {
                ageGroupIncidence95L = dataItem.valueset[ageGroupPlot.getName()].PREDICTION.avg - dataItem.valueset[ageGroupPlot.getName()].PREDICTION.std * 1.96; // magic number -- formalize
                ageGroupIncidence95U = dataItem.valueset[ageGroupPlot.getName()].PREDICTION.avg + dataItem.valueset[ageGroupPlot.getName()].PREDICTION.std * 1.96 - ageGroupIncidence95L; // magic number -- formalize
                ageGroupIncidence68L = dataItem.valueset[ageGroupPlot.getName()].PREDICTION.avg - dataItem.valueset[ageGroupPlot.getName()].PREDICTION.std * 1; // magic number -- formalize
                ageGroupIncidence68U = dataItem.valueset[ageGroupPlot.getName()].PREDICTION.avg + dataItem.valueset[ageGroupPlot.getName()].PREDICTION.std * 1 - ageGroupIncidence68L; // magic number -- formalize
            }

            const item = {
                categoryX: dataItem.categoryX,
                ageGroupSusceptible,
                ageGroupExposed,
                ageGroupInfectious,
                ageGroupRemovedID,
                ageGroupRemovedIU,
                ageGroupRemovedVI,
                ageGroupRemovedVU,
                ageGroupRemovedV2,
                ageGroupIncidence,
                ageGroupIncidence95L,
                ageGroupIncidence95U,
                ageGroupIncidence68L,
                ageGroupIncidence68U,
                ageGroupCasesP,
                ageGroupCasesN,
                seasonality,
                reproductionP
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
                let label = value && ControlsConstants.HEATMAP_DATA_PARAMS[this.chartMode].getHeatLabel(value);
                let gamma = Math.pow(value + randomVd, 1 / 1.15); // apply some gamma for better value perception

                let color: string;
                if (QueryUtil.getInstance().isDiffDisplay() && dataItem && dataItem00) { //

                    const caseValue =  dataItem.valueset[ageGroupHeat.getName()].CASES / dataItem00.getAverageCases(ageGroupHeat.getIndex()) - 1;

                    // const caseValue = dataItem.derivs ? dataItem.derivs[ageGroupHeat.getName()] : 0;

                    let r = 0;
                    let g = 0;
                    let b = 0;
                    if (caseValue >= 0) {
                        g = caseValue * 5;
                    }
                    else {
                        r = caseValue * - 5;
                    }

                    const rgb = [Math.min(1, r), Math.min(1, g), b];

                    const hsv = [0, 0, 0];
                    ColorUtil.rgbToHsv(rgb, hsv);
                    color = new Color(hsv[0], hsv[1], hsv[2]).getHex();

                    label = caseValue?.toLocaleString();
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

        if (!QueryUtil.getInstance().isDiffDisplay()) {
            this.applyMaxHeat(maxGamma);
            const keys = Object.keys(heatData[0]);
            for (let i = 0; i < heatData.length; i++) {
                for (const key of keys) { // const key in chartData[i]
                    this.chart.data[i][key] = heatData[i][key];
                }
            }
            // when there is an "early prediction", the right part of the heatmap needs to be black
            for (let i = heatData.length; i < this.chart.data.length; i++) {
                this.chart.data[i].value = 0;
                this.chart.data[i].gamma = 0;
            }
            this.chart.invalidateRawData();
        } else {
            this.chart.data = heatData;
        }

        this.seriesAgeGroupSusceptible.getSeries().data = plotData;
        this.seriesAgeGroupExposed.getSeries().data = plotData;
        this.seriesAgeGroupInfectious.getSeries().data = plotData;
        this.seriesAgeGroupRemovedID.getSeries().data = plotData;
        this.seriesAgeGroupRemovedIU.getSeries().data = plotData;
        this.seriesAgeGroupRemovedVI.getSeries().data = plotData;
        this.seriesAgeGroupRemovedVU.getSeries().data = plotData;
        this.seriesAgeGroupRemovedV2.getSeries().data = plotData;
        this.seriesAgeGroupIncidence.getSeries().data = plotData;
        this.seriesAgeGroupIncidence95L.getSeries().data = plotData;
        this.seriesAgeGroupIncidence95U.getSeries().data = plotData;
        this.seriesAgeGroupIncidence68L.getSeries().data = plotData;
        this.seriesAgeGroupIncidence68U.getSeries().data = plotData;
        this.seriesAgeGroupCasesP.getSeries().data = plotData;
        this.seriesAgeGroupCasesN.getSeries().data = plotData;
        this.seriesSeasonality.getSeries().data = plotData;
        this.seriesReproductionP.getSeries().data = plotData;



        // });

        // // console.log('heatData', heatData);
        // const keys = Object.keys(chartData[0]);

        // if (this.chart.data.length === chartData.length && !QueryUtil.getInstance().isDiffDisplay()) {
        //     for (let i = 0; i < chartData.length; i++) {
        //         for (const key of keys) { // const key in chartData[i]
        //             this.chart.data[i][key] = chartData[i][key];
        //         }
        //     }
        //     this.chart.invalidateRawData();
        // } else {
        //     this.chart.data = chartData;
        //     this.renderBaseData();
        // }

    }

    async renderBaseData(): Promise<void> {

        const baseData: any[] = [];
        const chartData: any[] = [];

        const _ageGroupIndex = this.getAgeGroupIndex();

        const ageGroupPlot = Demographics.getInstance().getAgeGroupsWithTotal()[_ageGroupIndex];

        const instantMin = ModelInstants.getInstance().getMinInstant();
        const instantMax = ModelInstants.getInstance().getMaxInstant();
        let incidenceMax = 0;
        for (let instant = instantMin; instant <= instantMax; instant += TimeUtil.MILLISECONDS_PER____DAY) {

            const categoryX = TimeUtil.formatCategoryDateFull(instant);

            let ageGroupRemovedVR1 = null;
            let ageGroupRemovedVR2 = null;
            let ageGroupIncidenceR = null;
            let ageGroupAverageCasesR: number;
            let positivityRateR = null;
            let ageGroupCasesR = null;
            let reproductionR = null;
            const dataItem00 = BaseData.getInstance().findBaseDataItem(instant);
            if (dataItem00) {

                ageGroupRemovedVR1 = dataItem00.getVacc1(ageGroupPlot.getName()) / ageGroupPlot.getAbsValue();
                ageGroupRemovedVR2 = dataItem00.getVacc2(ageGroupPlot.getName()) / ageGroupPlot.getAbsValue();
                ageGroupIncidenceR = dataItem00.getIncidence(ageGroupPlot.getIndex());
                if (ageGroupIncidenceR && !Number.isNaN(ageGroupIncidenceR)) {
                    incidenceMax = Math.max(incidenceMax, ageGroupIncidenceR);
                }

                ageGroupAverageCasesR = dataItem00.getAverageCases(ageGroupPlot.getIndex());

                ageGroupCasesR = dataItem00.getCasesM1(ageGroupPlot.getIndex());
                positivityRateR = dataItem00.getAveragePositivity();
                if (positivityRateR && !Number.isNaN(positivityRateR)) {
                    positivityRateR *= 10; // TODO project this into a usable scale
                }

                reproductionR = dataItem00.getReproduction(ageGroupPlot.getIndex()); // dataItem00.getAverageMobilityOther();//

            } else {
                // console.log('no data found', categoryX);
            }

            const item = {
                categoryX,
                ageGroupRemovedVR1,
                ageGroupRemovedVR2,
                ageGroupIncidenceR,
                ageGroupAverageCasesR,
                positivityRateR,
                ageGroupCasesR,
                reproductionR
            }
            baseData.push(item);

            chartData.push({
                categoryX
            })

        }

        if (this.chart.data.length === 0) {
            console.log('primary heat value setup');
            const initialChartData: any[] = [];
            for (let i = 0; i < baseData.length; i++) {
                Demographics.getInstance().getAgeGroupsWithTotal().forEach(ageGroupHeat => {
                    initialChartData.push({
                        categoryX: baseData[i].categoryX,
                        categoryY: ageGroupHeat.getName(),
                        gamma: 0
                    });
                });
            }
            this.chart.data = initialChartData;
        }

        this.seriesAgeGroupRemovedVR1.getSeries().data = baseData;
        this.seriesAgeGroupRemovedVR2.getSeries().data = baseData;
        this.seriesAgeGroupIncidenceR.getSeries().data = baseData;
        this.seriesAgeGroupAverageCasesR.getSeries().data = baseData;
        this.seriesPositivityRateR.getSeries().data = baseData;
        this.seriesAgeGroupCasesR.getSeries().data = baseData;
        this.seriesReproductionR.getSeries().data = baseData;

        // /**
        //  * chart data must have been set at least once, or this will fail
        //  */
        // if (this.chart.data.length === plotData.length) {
        //     for (let i = 0; i < plotData.length; i++) {
        //         for (const key of Object.keys(plotData[i])) { // const key in chartData[i]
        //             this.chart.data[i][key] = plotData[i][key];
        //         }
        //     }
        // } else {
        //     this.chart.data = plotData;
        //     this.renderBaseData();
        // }
        // this.chart.invalidateRawData();

    }

}

