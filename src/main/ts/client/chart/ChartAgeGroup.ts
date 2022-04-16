import { Bullet, CategoryAxis, CategoryAxisDataItem, Column, ColumnSeries, LineSeries, StepLineSeries, ValueAxis, XYChart, XYCursor } from "@amcharts/amcharts4/charts";
import { color, Container, create, Label, percent, Rectangle, useTheme } from "@amcharts/amcharts4/core";
import am4themes_animated from '@amcharts/amcharts4/themes/animated';
import am4themes_dark from '@amcharts/amcharts4/themes/dark';
import { IModificationValuesDiscovery } from "../../common/modification/IModificationValueDiscovery";
import { IModificationValuesStrain } from '../../common/modification/IModificationValuesStrain';
import { Modifications } from '../../common/modification/Modifications';
import { BaseData } from '../../model/basedata/BaseData';
import { Color } from '../../util/Color';
import { QueryUtil } from '../../util/QueryUtil';
import { ControlsRegression } from '../controls/ControlsRegression';
import { CHART_MODE______KEY, ControlsConstants } from '../gui/ControlsConstants';
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
    protected readonly seriesEstimationValue: ChartAgeGroupSeries;
    protected readonly seriesEstimationValue95U: ChartAgeGroupSeries;
    protected readonly seriesEstimationValue95L: ChartAgeGroupSeries;
    protected readonly seriesEstimationValueM: ChartAgeGroupSeries;
    protected readonly seriesEstimationValueL: ChartAgeGroupSeries;
    protected readonly seriesEstimationValueLL: ChartAgeGroupSeries;
    protected readonly seriesEstimationValueLU: ChartAgeGroupSeries;

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

    /**
     * modelled vaccination data
     */
    protected readonly seriesAgeGroupRemovedVI: ChartAgeGroupSeries;
    protected readonly seriesAgeGroupRemovedV2: ChartAgeGroupSeries;

    /**
     * modelled discovery rate
     */
    protected readonly seriesAgeGroupDiscovery: ChartAgeGroupSeries;

    /**
     * real data
     */
    protected readonly seriesAgeGroupRemovedVR1: ChartAgeGroupSeries;
    protected readonly seriesAgeGroupRemovedVR2: ChartAgeGroupSeries;
    protected readonly seriesAgeGroupRemovedVR3: ChartAgeGroupSeries;
    protected readonly seriesAgeGroupIncidenceR: ChartAgeGroupSeries; // real incidence
    protected readonly seriesPositivityRateR: ChartAgeGroupSeries; // real test numbers
    protected readonly seriesHospitalizationR: ChartAgeGroupSeries; // real hospitalization (all ages only)
    protected readonly seriesIcuR: ChartAgeGroupSeries; // real icu (all ages only)

    protected readonly seriesMobilityOther: ChartAgeGroupSeries;

    private readonly selectedModificationRange: CategoryAxisDataItem;
    private readonly selectedModificationLabel: Label;

    /**
     * real average cases
     */
    protected readonly seriesAgeGroupAverageCasesR: ChartAgeGroupSeries;

    protected readonly seriesHeat: ColumnSeries;

    private absValue: number; // the absolute value of the age-group currently displayed
    private contactNote: string;

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
        // this.ageGroupIndex = -1;
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
        this.selectedModificationRange.grid.fillOpacity = 0.00;
        this.selectedModificationRange.grid.strokeOpacity = 0.75;
        this.selectedModificationRange.grid.strokeWidth = 2
        this.selectedModificationRange.grid.stroke = color(ControlsConstants.COLOR____FONT).brighten(-0.4);
        this.selectedModificationRange.grid.strokeDasharray = '4, 2';
        this.selectedModificationRange.label.visible = false;

        const multilayerBullet = new Bullet();
        this.selectedModificationLabel = multilayerBullet.createChild(Label);
        this.selectedModificationLabel.rotation = -90;
        this.selectedModificationLabel.text = 'here';
        this.selectedModificationLabel.fontFamily = ControlsConstants.FONT_FAMILY;
        this.selectedModificationLabel.fontSize = ControlsConstants.FONT_SIZE - 2;
        this.selectedModificationLabel.fill = color(ControlsConstants.COLOR____FONT);
        this.selectedModificationLabel.strokeOpacity = 0;
        this.selectedModificationLabel.fillOpacity = 1;
        this.selectedModificationLabel.valign = 'top';
        this.selectedModificationLabel.adapter.add('dy', (value, target) => {
            target.measure();
            // console.log(target.measuredHeight, this.chart.plotContainer.contentHeight, value);
            return target.measuredHeight - this.chart.plotContainer.contentHeight + 4;
        });

        this.selectedModificationRange.bullet = multilayerBullet;

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
            strokeWidth: 2,
            dashed: true,
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
        // this.seriesAgeGroupIncidence95L.getSeries().strokeOpacity = 0.5;
        this.seriesAgeGroupIncidence95U = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotIncidence,
            title: 'incidence (CI95)',
            baseLabel: 'CI 95%',
            valueField: 'ageGroupIncidence95U',
            colorKey: 'CASES',
            strokeWidth: 2,
            dashed: true,
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
        // this.seriesAgeGroupIncidence95U.getSeries().strokeOpacity = 0.5;
        this.seriesAgeGroupIncidence95U.getSeries().fillOpacity = 0.2;
        this.seriesAgeGroupIncidence95U.bindToLegend(this.seriesAgeGroupIncidence95L);

        this.seriesAgeGroupIncidence68L = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotIncidence,
            title: 'incidence (CI68)',
            baseLabel: 'incidence (CI68)',
            valueField: 'ageGroupIncidence68L',
            colorKey: 'CASES',
            strokeWidth: 2,
            dashed: true,
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
        // this.seriesAgeGroupIncidence68L.getSeries().strokeOpacity = 0.5;
        this.seriesAgeGroupIncidence68U = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotIncidence,
            title: 'incidence (CI68)',
            baseLabel: 'CI 68%',
            valueField: 'ageGroupIncidence68U',
            colorKey: 'CASES',
            strokeWidth: 2,
            dashed: true,
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
        // this.seriesAgeGroupIncidence68U.getSeries().strokeOpacity = 0.5;
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
            locationOnPath: 0.41,
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
            locationOnPath: 0.3,
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
            baseLabel: 'cases (ages)',
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
            strokeWidth: 4,
            dashed: false,
            locationOnPath: 0.16,
            labels: {
                tooltip: true,
                pathtip: true
            },
            stacked: false,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_ABSOLUTE_FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });
        this.seriesAgeGroupIncidence.getSeries().fillOpacity = 0.1;

        this.seriesAgeGroupIncidenceR = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotIncidence,
            title: 'incidence (ages)',
            baseLabel: 'incidence (ages)',
            valueField: 'ageGroupIncidenceR',
            colorKey: 'STRAIN',
            strokeWidth: 2,
            dashed: false,
            locationOnPath: 0.05,
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

        const vaccSeriesColor = '#000000';
        this.seriesAgeGroupRemovedV2 = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent,
            title: 'vaccinated',
            baseLabel: 'vaccinated',
            valueField: 'ageGroupRemovedV2',
            colorKey: 'VACCINATION',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.05,
            labels: {
                tooltip: true,
                pathtip: false
            },
            stacked: true,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });
        this.seriesAgeGroupRemovedV2.getSeries().stroke = color(vaccSeriesColor);


        this.seriesAgeGroupRemovedVI = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent,
            title: 'immunizing',
            baseLabel: 'immunizing',
            valueField: 'ageGroupRemovedVI',
            colorKey: 'IMMUNIZING',
            strokeWidth: 1,
            dashed: false,
            locationOnPath: 0.25,
            labels: {
                tooltip: true,
                pathtip: false
            },
            stacked: true,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });
        this.seriesAgeGroupRemovedVI.getSeries().stroke = color(vaccSeriesColor);


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
                pathtip: false
            },
            stacked: true,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });
        this.seriesAgeGroupSusceptible.getSeries().stroke = color(vaccSeriesColor);
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
                pathtip: false
            },
            stacked: true,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });
        this.seriesAgeGroupExposed.getSeries().stroke = color(vaccSeriesColor);

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
                pathtip: false
            },
            stacked: true,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });
        this.seriesAgeGroupInfectious.getSeries().stroke = color(vaccSeriesColor);

        /**
         * recovered after known infection
         */
        this.seriesAgeGroupRemovedID = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent,
            title: 'recovered',
            baseLabel: 'recovered',
            valueField: 'ageGroupRemovedID',
            colorKey: 'REMOVED',
            strokeWidth: 0,
            dashed: false,
            locationOnPath: 0.15,
            labels: {
                tooltip: true,
                pathtip: false
            },
            stacked: true,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });
        // no need to switch to black, should not have stroke at all



        /**
         * vaccinated (first)
         */
        this.seriesAgeGroupRemovedVR1 = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent,
            title: 'vaccinated',
            baseLabel: '1st',
            valueField: 'ageGroupRemovedVR1',
            colorKey: 'SEASONALITY',
            strokeWidth: 1,
            dashed: true,
            locationOnPath: 0.02,
            labels: {
                tooltip: false,
                pathtip: true
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
            baseLabel: '2nd',
            valueField: 'ageGroupRemovedVR2',
            colorKey: 'SEASONALITY',
            strokeWidth: 1,
            dashed: true,
            locationOnPath: 0.02,
            labels: {
                tooltip: false,
                pathtip: true
            },
            stacked: false,
            legend: false,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });
        this.seriesAgeGroupRemovedVR1.bindToLegend(this.seriesAgeGroupRemovedVR2);
        this.seriesAgeGroupRemovedVR3 = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent,
            title: 'vaccinated',
            baseLabel: '3rd',
            valueField: 'ageGroupRemovedVR3',
            colorKey: 'SEASONALITY',
            strokeWidth: 1,
            dashed: true,
            locationOnPath: 0.02,
            labels: {
                tooltip: false,
                pathtip: true
            },
            stacked: false,
            legend: false,
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });
        this.seriesAgeGroupRemovedVR1.bindToLegend(this.seriesAgeGroupRemovedVR3);


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

        this.seriesAgeGroupDiscovery = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent,
            title: 'discovery rate',
            baseLabel: 'discovery rate',
            valueField: 'ageGroupDiscoveryRate',
            colorKey: 'TESTING',
            strokeWidth: 2,
            dashed: false,
            locationOnPath: 0.15,
            labels: {
                tooltip: true,
                pathtip: true
            },
            stacked: false,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_ABSOLUTE_FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });

        this.seriesMobilityOther = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent,
            title: 'mobility, other',
            baseLabel: 'mobility, other',
            valueField: 'mobilityOther',
            colorKey: 'TESTING',
            strokeWidth: 2,
            dashed: false,
            locationOnPath: 0.55,
            labels: {
                tooltip: true,
                pathtip: true
            },
            stacked: false,
            legend: true,
            labellingDefinition: ControlsConstants.LABEL_ABSOLUTE_FLOAT_2,
            seriesConstructor: () => new LineSeries()
        });

        this.seriesHospitalizationR = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent,
            title: 'hospitalization',
            baseLabel: 'hospitalization',
            valueField: 'hospitalizationR',
            colorKey: 'VACCINATION',
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
        this.seriesIcuR = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent,
            title: 'icu',
            baseLabel: 'icu',
            valueField: 'icuR',
            colorKey: 'CASES',
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



        this.seriesEstimationValueM = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent,
            title: 'estimation settings',
            baseLabel: 'estimation settings',
            valueField: 'estimationValueM',
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

        this.seriesEstimationValueL = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent,
            title: 'estimation smoothed',
            baseLabel: 'estimation smoothed',
            valueField: 'estimationValueL',
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
        this.seriesEstimationValueLL = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent,
            title: 'estimation loess off',
            baseLabel: 'estimation loess off',
            valueField: 'estimationValueLL',
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
        this.seriesEstimationValueLL.getSeries().strokeOpacity = 0.5;
        this.seriesEstimationValueL.bindToLegend(this.seriesEstimationValueLL);
        this.seriesEstimationValueLU = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent,
            title: 'estimation loess off',
            baseLabel: 'estimation loess off',
            valueField: 'estimationValueLU',
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
        this.seriesEstimationValueLU.getSeries().strokeOpacity = 0.5;
        this.seriesEstimationValueLU.getSeries().fillOpacity = 0.2;
        this.seriesEstimationValueL.bindToLegend(this.seriesEstimationValueLU);

        this.seriesEstimationValue = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent,
            title: 'estimation',
            baseLabel: 'estimation',
            valueField: 'estimationValue',
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
        this.seriesEstimationValue95L = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent,
            title: 'estimation',
            baseLabel: 'estimation',
            valueField: 'estimationValue95L',
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
        this.seriesEstimationValue95L.getSeries().strokeOpacity = 0.5;
        this.seriesEstimationValue.bindToLegend(this.seriesEstimationValue95L);
        this.seriesEstimationValue95U = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotPercent,
            title: 'estimation',
            baseLabel: 'estimation',
            valueField: 'estimationValue95U',
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
        this.seriesEstimationValue95U.getSeries().strokeOpacity = 0.5;
        this.seriesEstimationValue95U.getSeries().fillOpacity = 0.2;
        this.seriesEstimationValue.bindToLegend(this.seriesEstimationValue95U);

        this.chart.cursor = new XYCursor();
        this.chart.cursor.xAxis = this.xAxis;
        this.chart.cursor.showTooltipOn = 'always';
        this.chart.cursor.exportable = true;
        this.chart.cursor.maxTooltipDistance = 12;
        this.chart.cursor.events.on('cursorpositionchanged', e => {

            const position = this.xAxis.pointToPosition(e.target.point);
            const category = this.xAxis.positionToCategory(position);
            const chartDataItem = this.findDataItemByCategory(category);
            const ageGroupIndex = ModelActions.getInstance().getAgeGroup().getIndex();
            if (chartDataItem) {
                const baseDataItem = BaseData.getInstance().findBaseDataItem(chartDataItem.instant);
                if (baseDataItem && baseDataItem.getIncidence(ageGroupIndex)) {
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
        this.columnTemplate.width = percent(110);
        this.columnTemplate.height = percent(100);
        this.columnTemplate.events.on('hit', e => {
            const index = e.target.dataItem.dataContext[ChartAgeGroup.FIELD______INDEX];
            ModelActions.getInstance().toggleAgeGroup(index, true);
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

        this.yAxisPlotPercent.adapter.add('max', (value, target) => {
            requestAnimationFrame(() => {
                this.updateSeriesNotes();
            });
            return value;
        });

        this.yAxisPlotIncidence.adapter.add('min', (value, target) => {
            value = 0;
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

    // getAgeGroupName(): string {
    //     const ageGroupIndex = ModelActions.getInstance().getAgeGroup().getIndex();
    //     return Demographics.getInstance().getAgeGroupsWithTotal()[a].getName()
    // }

    // getAgeGroupIndex(): number {
    //     return this.ageGroupIndex >= 0 ? this.ageGroupIndex : Demographics.getInstance().getAgeGroups().length;
    // }

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

        const strippedData: any[] = [];
        this.modelData.forEach(data => {
            strippedData.push({
                instant: data.instant,
                date: '',
                cases_00_04: data.valueset['<= 04'].CASES.toLocaleString(),
                disco_00_04: data.valueset['<= 04'].DISCOVERY.toLocaleString(),
                assum_00_04: (data.valueset['<= 04'].CASES / data.valueset['<= 04'].DISCOVERY).toLocaleString(),
                cases_05_14: data.valueset['05-14'].CASES.toLocaleString(),
                disco_05_14: data.valueset['05-14'].DISCOVERY.toLocaleString(),
                assum_05_14: (data.valueset['05-14'].CASES / data.valueset['05-14'].DISCOVERY).toLocaleString(),
                cases_15_24: data.valueset['15-24'].CASES.toLocaleString(),
                disco_15_24: data.valueset['15-24'].DISCOVERY.toLocaleString(),
                assum_15_24: (data.valueset['15-24'].CASES / data.valueset['15-24'].DISCOVERY).toLocaleString(),
                cases_25_34: data.valueset['25-34'].CASES.toLocaleString(),
                disco_25_34: data.valueset['25-34'].DISCOVERY.toLocaleString(),
                assum_25_34: (data.valueset['25-34'].CASES / data.valueset['25-34'].DISCOVERY).toLocaleString(),
                cases_35_44: data.valueset['35-44'].CASES.toLocaleString(),
                disco_35_44: data.valueset['35-44'].DISCOVERY.toLocaleString(),
                assum_35_44: (data.valueset['35-44'].CASES / data.valueset['35-44'].DISCOVERY).toLocaleString(),
                cases_45_54: data.valueset['45-54'].CASES.toLocaleString(),
                disco_45_54: data.valueset['45-54'].DISCOVERY.toLocaleString(),
                assum_45_54: (data.valueset['45-54'].CASES / data.valueset['45-54'].DISCOVERY).toLocaleString(),
                cases_55_64: data.valueset['55-64'].CASES.toLocaleString(),
                disco_55_64: data.valueset['55-64'].DISCOVERY.toLocaleString(),
                assum_55_64: (data.valueset['55-64'].CASES / data.valueset['55-64'].DISCOVERY).toLocaleString(),
                cases_65_74: data.valueset['65-74'].CASES.toLocaleString(),
                disco_65_74: data.valueset['65-74'].DISCOVERY.toLocaleString(),
                assum_65_74: (data.valueset['65-74'].CASES / data.valueset['65-74'].DISCOVERY).toLocaleString(),
                cases_75_84: data.valueset['75-84'].CASES.toLocaleString(),
                disco_75_84: data.valueset['75-84'].DISCOVERY.toLocaleString(),
                assum_75_84: (data.valueset['75-84'].CASES / data.valueset['75-84'].DISCOVERY).toLocaleString(),
                cases_85_00: data.valueset['>= 85'].CASES.toLocaleString(),
                disco_85_00: data.valueset['>= 85'].DISCOVERY.toLocaleString(),
                assum_85_00: (data.valueset['>= 85'].CASES / data.valueset['>= 85'].DISCOVERY).toLocaleString(),
            })
        })
        // StorageUtil.getInstance().exportJson(this.modelData);
        StorageUtil.getInstance().exportJson(strippedData);
    }

    async handleAgeGroupChange(): Promise<void> {

        // console.warn('set age group index');
        const requiresRegressionDataRender = this.getChartMode() === 'CONTACT';

        const ageGroupIndex = ModelActions.getInstance().getAgeGroup().getIndex();
        this.updateTitle();

        const ageGroup = Demographics.getInstance().getAgeGroupsWithTotal()[ageGroupIndex];
        this.contactNote = ageGroup.getName();
        this.absValue = ageGroup.getAbsValue();

        if (ObjectUtil.isNotEmpty(this.modelData)) {

            // if (requiresBaseDataRender) {
            this.renderBaseData();
            // }
            if (requiresRegressionDataRender) {
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



    }

    updateSeriesNotes(): void {

        const ageGroup = ModelActions.getInstance().getAgeGroup(); // Demographics.getInstance().getAgeGroupsWithTotal()[this.ageGroupIndex];

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
        this.seriesAgeGroupDiscovery.setSeriesNote(ageGroup.getName());
        this.seriesMobilityOther.setSeriesNote(ModelConstants.AGEGROUP_NAME_______ALL);
        this.seriesHospitalizationR.setSeriesNote(ModelConstants.AGEGROUP_NAME_______ALL);
        this.seriesIcuR.setSeriesNote(ModelConstants.AGEGROUP_NAME_______ALL);


        this.seriesAgeGroupSusceptible.setSeriesNote(ageGroup.getName());
        this.seriesAgeGroupExposed.setSeriesNote(ageGroup.getName());
        this.seriesAgeGroupInfectious.setSeriesNote(ageGroup.getName());
        this.seriesAgeGroupRemovedID.setSeriesNote(ageGroup.getName());
        this.seriesAgeGroupRemovedVI.setSeriesNote(ageGroup.getName());
        this.seriesAgeGroupRemovedV2.setSeriesNote(ageGroup.getName());
        this.seriesAgeGroupRemovedVR1.setSeriesNote(ageGroup.getName());
        this.seriesAgeGroupRemovedVR2.setSeriesNote(ageGroup.getName());
        this.seriesAgeGroupRemovedVR3.setSeriesNote(ageGroup.getName());

        this.seriesEstimationValue.setSeriesNote(this.contactNote);
        this.seriesEstimationValue95L.setSeriesNote(this.contactNote);
        this.seriesEstimationValue95U.setSeriesNote(this.contactNote);
        this.seriesEstimationValueM.setSeriesNote(this.contactNote);
        this.seriesEstimationValueL.setSeriesNote(this.contactNote);
        this.seriesEstimationValueLL.setSeriesNote(this.contactNote);
        this.seriesEstimationValueLU.setSeriesNote(this.contactNote);

        this.seriesReproductionP.setSeriesNote(ageGroup.getName());
        this.seriesReproductionR.setSeriesNote(ageGroup.getName());

    }

    async handleCategoryChange(): Promise<void> {

        this.contactNote = ModelActions.getInstance().getCategory();

        this.updateSeriesNotes();

        if (this.getChartMode() === 'CONTACT') {
            this.renderRegressionData();
        }

        if (ObjectUtil.isNotEmpty(this.modelData)) {
            this.requestRenderModelData();
        }

    }

    async handleVaccKeyChange(): Promise<void> {

        const modelActions = ModelActions.getInstance();
        this.contactNote = `${modelActions.getAgeGroup().getName()}-${modelActions.getVaccKey()}`;

        this.updateSeriesNotes();

        if (this.getChartMode() === 'CONTACT') {
            this.renderRegressionData();
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
                range.grid.stroke = color(ControlsConstants.COLOR____FONT).brighten(-0.20);
            } else {
                range.grid.stroke = color(ControlsConstants.COLOR____FONT).brighten(-0.60);
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
        const minPointX = this.xAxis.categoryToPoint(minCategoryX).x;
        const maxPointX = this.xAxis.categoryToPoint(maxCategoryX).x;
        const fctPointX = (offsetCoordinate.x - minPointX) / (maxPointX - minPointX);
        const vacPointX = minInstant + (maxInstant - minInstant) * fctPointX;

        // round to closest midnight
        const valueX = Math.round(vacPointX / TimeUtil.MILLISECONDS_PER____DAY) * TimeUtil.MILLISECONDS_PER____DAY;

        const positionY = this.yAxisPlotPercent.pointToPosition(offsetCoordinate);
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
        const minPointX = this.xAxis.categoryToPoint(minCategoryX).x;
        const maxPointX = this.xAxis.categoryToPoint(maxCategoryX).x;
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
                    tooltip: true,
                    pathtip: true
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
        seriesAgeGroup.setVisible(this.chartMode === 'INCIDENCE');
        // seriesAgeGroup.setVisible(false);
        return seriesAgeGroup;

    }

    setSeriesSRVisible(visible: boolean): void {

        this.yAxisPlotPercent.visible = visible;
        this.yAxisPlotPercent.renderer.grid.template.disabled = !visible;
        this.yAxisPlotPercent.tooltip.disabled = !visible;
        this.setAxisPercentBounds(0, 1);

        this.seriesAgeGroupSusceptible.setVisible(visible);
        this.seriesAgeGroupRemovedID.setVisible(visible);

        this.seriesAgeGroupRemovedVI.setVisible(visible);
        this.seriesAgeGroupRemovedV2.setVisible(visible);

        this.seriesAgeGroupRemovedVR1.setVisible(visible);
        this.seriesAgeGroupRemovedVR2.setVisible(visible);
        this.seriesAgeGroupRemovedVR3.setVisible(visible);
        this.seriesAgeGroupRemovedVR1.getSeries().visible = false;
        this.seriesAgeGroupRemovedVR2.getSeries().visible = false;
        this.seriesAgeGroupRemovedVR3.getSeries().visible = false;

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
            seriesAgeGroupIncidence.setVisible(visible);
        });
        const modificationValuesStrain = Modifications.getInstance().findModificationsByType('STRAIN').map(m => m.getModificationValues() as IModificationValuesStrain);

        // specific incidence makes sense only if there is more than one strain
        if (visible && modificationValuesStrain.length > 1) {
            // turn all active strain back on
            modificationValuesStrain.forEach(strainValues => {
                this.getOrCreateSeriesAgeGroupIncidenceStrain(strainValues).setVisible(visible);
            });
        }

    }

    updateModificationInstant(instant: number, modificationName: string, modificationColor: string): void {
        this.selectedModificationRange.category = TimeUtil.formatCategoryDateFull(instant);
        this.selectedModificationRange.grid.stroke = color(modificationColor).brighten(0.4);
        this.selectedModificationLabel.text = modificationName;
    }

    setSeriesContactVisible(visible: boolean): void {

        if (visible) {
            this.yAxisPlotPercent.visible = visible;
            this.yAxisPlotPercent.renderer.grid.template.disabled = !visible;
            this.yAxisPlotPercent.tooltip.disabled = !visible;
        }

        this.seriesEstimationValue.setVisible(visible);
        this.seriesEstimationValue95L.setVisible(visible);
        this.seriesEstimationValue95U.setVisible(visible);
        this.seriesEstimationValueM.setVisible(visible);
        this.seriesEstimationValueL.setVisible(visible);
        this.seriesEstimationValueLL.setVisible(visible);
        this.seriesEstimationValueLU.setVisible(visible);

    }

    setSeriesReproductionVisible(visible: boolean): void {

        if (visible) {
            this.yAxisPlotPercent.visible = visible;
            this.yAxisPlotPercent.renderer.grid.template.disabled = !visible;
            this.yAxisPlotPercent.tooltip.disabled = !visible;
            this.setAxisPercentBounds(0, 2);
        }

        this.seriesReproductionP.setVisible(visible);
        this.seriesReproductionR.setVisible(visible);
        this.seriesSeasonality.setVisible(visible);

        this.seriesMobilityOther.setVisible(visible);


    }

    setSeriesTestingVisible(visible: boolean): void {

        this.seriesPositivityRateR.setVisible(visible);
        this.seriesAgeGroupDiscovery.setVisible(visible);

        if (visible) {
            this.yAxisPlotPercent.visible = visible;
            this.yAxisPlotPercent.renderer.grid.template.disabled = !visible;
            this.yAxisPlotPercent.tooltip.disabled = !visible;
            this.setAxisPercentBounds(0, 1.0);
        }

    }

    setSeriesHospitalVisible(visible: boolean): void {

        if (visible) {
            this.yAxisPlotPercent.visible = visible;
            this.yAxisPlotPercent.renderer.grid.template.disabled = !visible;
            this.yAxisPlotPercent.tooltip.disabled = !visible;
            this.setAxisPercentBounds(0, 0.001);
        }

        this.seriesHospitalizationR.setVisible(visible);
        this.seriesIcuR.setVisible(visible);

    }

    setChartMode(chartMode: CHART_MODE______KEY): void {

        // console.warn('set chart mode');

        this.chartMode = chartMode;
        ControlsConstants.HEATMAP_DATA_PARAMS[this.chartMode].visitChart(this);
        this.updateTitle();
        if (chartMode === 'CONTACT') {
            this.renderRegressionData();
        }
        this.requestRenderModelData();
    }

    private updateTitle(): void {
        const charModeName = ControlsConstants.HEATMAP_DATA_PARAMS[this.chartMode].title;
        const ageGroupName = ModelActions.getInstance().getAgeGroup().getName();
        this.chartTitle.text = `${charModeName} [font-size: 12px](age: ${ageGroupName})[/]`;
    }

    getChartMode(): CHART_MODE______KEY {
        return this.chartMode;
    }

    setAxisPercentBounds(min: number, max: number): void {
        this.yAxisPlotPercent.min = min; // min;
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
            const minInstant = TimeUtil.parseCategoryDateFull(minCategory);
            const maxInstant = TimeUtil.parseCategoryDateFull(maxCategory);

            let maxIncidence = 0;
            // let maxInfectious = 0;
            for (const dataItem of this.modelData) {
                if (dataItem.instant >= minInstant && dataItem.instant <= maxInstant) {
                    Demographics.getInstance().getAgeGroups().forEach(ageGroupHeat => {

                        // maxIncidence = Math.max(maxIncidence, dataItem.valueset[ageGroupHeat.getName()].INCIDENCES[ModelConstants.STRAIN_ID___________ALL]);
                        // maxInfectious = Math.max(maxInfectious, dataItem.valueset[ageGroupHeat.getName()].INFECTIOUS[ModelConstants.STRAIN_ID___________ALL]);
                        maxIncidence = Math.max(maxIncidence, dataItem.valueset[ageGroupHeat.getName()].INCIDENCES[ModelConstants.STRAIN_ID___________ALL]);

                        const casesScaled1 = dataItem.valueset[ageGroupHeat.getName()].CASES * 700000 / ageGroupHeat.getAbsValue();
                        if (this.seriesAgeGroupCasesP.isVisible()) {
                            maxIncidence = Math.max(maxIncidence, casesScaled1);
                        }

                        if (this.seriesAgeGroupCasesN.isVisible()) {
                            const casesOffset = BaseData.getInstance().getAverageOffset(ageGroupHeat.getIndex(), dataItem.instant);
                            if (casesOffset) {
                                maxIncidence = Math.max(maxIncidence, casesScaled1 * casesOffset); // daily prediction
                            }
                        }

                        if (this.seriesAgeGroupCasesR.isVisible()) {
                            const dataItem00 = BaseData.getInstance().findBaseDataItem(dataItem.instant);
                            if (dataItem00) {
                                const casesScaled2 = dataItem00.getCasesM1(ageGroupHeat.getIndex()) * 700000 / ageGroupHeat.getAbsValue();
                                maxIncidence = Math.max(maxIncidence, casesScaled2);
                            }
                        }

                    });
                }
            }

            this.yAxisPlotIncidence.min = 0;
            this.yAxisPlotIncidence.max = maxIncidence * 1.05;
            console.log('maxIncidence', maxIncidence);

            // this.yAxisPlotPercent.min = 0;
            // this.yAxisPlotPercent.max = maxInfectious * 1.00;

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

    async renderRegressionData(): Promise<void> {

        const plotData: any[] = [];
        for (const dataItem of this.modelData) {

            const renderableRegressionResult = ControlsRegression.getInstance().getRenderableRegressionResult(dataItem.instant);

            const estimationValue = renderableRegressionResult.regression;
            const estimationValue95L = renderableRegressionResult.ci95Min && Math.max(0, renderableRegressionResult.ci95Min);
            const estimationValue95U = renderableRegressionResult.ci95Max && renderableRegressionResult.ci95Max - estimationValue95L;

            const estimationValueM = renderableRegressionResult.loess && renderableRegressionResult.loess.m;

            let estimationValueL: number;
            let estimationValueLL: number;
            let estimationValueLU: number;
            if (renderableRegressionResult.loess && renderableRegressionResult.loess.o && renderableRegressionResult.loess.y) {
                estimationValueL = renderableRegressionResult.loess.y;
                estimationValueLL = renderableRegressionResult.loess.y - renderableRegressionResult.loess.o;
                estimationValueLU = renderableRegressionResult.loess.y + renderableRegressionResult.loess.o - estimationValueLL;
            }

            const item = {
                categoryX: dataItem.categoryX,
                estimationValue,
                estimationValue95L,
                estimationValue95U,
                estimationValueM,
                estimationValueL,
                estimationValueLL,
                estimationValueLU
            }

            // console.log(TimeUtil.formatCategoryDateFull(dataItem.instant), item);

            plotData.push(item);

        }

        const chartData = [...plotData];

        this.seriesEstimationValue.getSeries().data = chartData;
        this.seriesEstimationValue95L.getSeries().data = chartData;
        this.seriesEstimationValue95U.getSeries().data = chartData;
        this.seriesEstimationValueM.getSeries().data = chartData;
        this.seriesEstimationValueL.getSeries().data = chartData;
        this.seriesEstimationValueLL.getSeries().data = chartData;
        this.seriesEstimationValueLU.getSeries().data = chartData;

    }

    async renderModelData(): Promise<void> {

        clearTimeout(this.renderTimeout);

        const ageGroupIndex = ModelActions.getInstance().getAgeGroup().getIndex();

        const plotData: any[] = [];
        const heatData: any[] = [];

        const modificationValuesStrain = Modifications.getInstance().findModificationsByType('STRAIN').map(m => m.getModificationValues() as IModificationValuesStrain);
        const modificationValuesDiscov = Modifications.getInstance().findModificationsByType('TESTING').map(m => m.getModificationValues() as IModificationValuesDiscovery);

        let maxGamma = 0;
        const randomVd = Math.random() * 0.00001;

        // console.log('modelData', this.modelData);

        const ageGroupPlot = Demographics.getInstance().getAgeGroupsWithTotal()[ageGroupIndex];
        for (const dataItem of this.modelData) {

            // data independent from sub-strains
            const ageGroupSusceptible = dataItem.valueset[ageGroupPlot.getName()].SUSCEPTIBLE;
            const ageGroupExposed = dataItem.valueset[ageGroupPlot.getName()].EXPOSED[ModelConstants.STRAIN_ID___________ALL];;
            const ageGroupInfectious = dataItem.valueset[ageGroupPlot.getName()].INFECTIOUS[ModelConstants.STRAIN_ID___________ALL];
            const ageGroupRemovedID = dataItem.valueset[ageGroupPlot.getName()].REMOVED_ID;
            const ageGroupRemovedVI = dataItem.valueset[ageGroupPlot.getName()].REMOVED_VI;
            const ageGroupRemovedV2 = dataItem.valueset[ageGroupPlot.getName()].REMOVED_V2;
            const ageGroupIncidence = dataItem.valueset[ageGroupPlot.getName()].INCIDENCES[ModelConstants.STRAIN_ID___________ALL];
            const ageGroupCasesP = dataItem.valueset[ageGroupPlot.getName()].CASES;
            const ageGroupDiscoveryRate = dataItem.valueset[ageGroupPlot.getName()].DISCOVERY;

            let ageGroupCasesN = ageGroupCasesP && BaseData.getInstance().getAverageOffset(ageGroupPlot.getIndex(), dataItem.instant);
            if (ageGroupCasesN) {
                ageGroupCasesN *= ageGroupCasesP;
            }

            const seasonality = dataItem.seasonality;
            const reproductionP = dataItem.valueset[ageGroupPlot.getName()].REPRODUCTION; // this.calculateRt(dataItem.instant);

            let ageGroupIncidence95L: number;
            let ageGroupIncidence95U: number;
            let ageGroupIncidence68L: number;
            let ageGroupIncidence68U: number;
            if (dataItem.valueset[ageGroupPlot.getName()].PREDICTION) {
                ageGroupIncidence95L = Math.max(0, dataItem.valueset[ageGroupPlot.getName()].PREDICTION.avg - dataItem.valueset[ageGroupPlot.getName()].PREDICTION.std * 1.96); // magic number -- formalize
                ageGroupIncidence95U = dataItem.valueset[ageGroupPlot.getName()].PREDICTION.avg + dataItem.valueset[ageGroupPlot.getName()].PREDICTION.std * 1.96 - ageGroupIncidence95L; // magic number -- formalize
                ageGroupIncidence68L = Math.max(0, dataItem.valueset[ageGroupPlot.getName()].PREDICTION.avg - dataItem.valueset[ageGroupPlot.getName()].PREDICTION.std * 1); // magic number -- formalize
                ageGroupIncidence68U = dataItem.valueset[ageGroupPlot.getName()].PREDICTION.avg + dataItem.valueset[ageGroupPlot.getName()].PREDICTION.std * 1 - ageGroupIncidence68L; // magic number -- formalize
            }

            const item = {
                categoryX: dataItem.categoryX,
                ageGroupSusceptible,
                ageGroupExposed,
                ageGroupInfectious,
                ageGroupRemovedID,
                ageGroupRemovedVI,
                ageGroupRemovedV2,
                ageGroupIncidence,
                ageGroupIncidence95L,
                ageGroupIncidence95U,
                ageGroupIncidence68L,
                ageGroupIncidence68U,
                ageGroupCasesP,
                ageGroupCasesN,
                seasonality,
                reproductionP,
                ageGroupDiscoveryRate
            };

            // const check = ageGroupRemovedV2 + ageGroupRemovedVI + ageGroupRemovedID + ageGroupSusceptible + ageGroupExposed + ageGroupInfectious;
            // if (TimeUtil.formatCategoryDateFull(dataItem.instant) === '25.12.2021') {
            //     console.log(TimeUtil.formatCategoryDateFull(dataItem.instant), check, [
            //         ageGroupRemovedV2, ageGroupRemovedVI, ageGroupRemovedID, ageGroupSusceptible, ageGroupExposed, ageGroupInfectious
            //     ]);
            // }


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

                    const caseValue = dataItem.valueset[ageGroupHeat.getName()].CASES / dataItem00.getAverageCases(ageGroupHeat.getIndex()) - 1;

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
        this.seriesAgeGroupRemovedVI.getSeries().data = plotData;
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
        this.seriesAgeGroupDiscovery.getSeries().data = plotData;

        this.seriesAgeGroupIncidenceByStrain.forEach(seriesAgeGroupIncidence => {
            seriesAgeGroupIncidence.getSeries().data = plotData;
        });

    }

    async renderBaseData(): Promise<void> {

        const baseData: any[] = [];
        const chartData: any[] = [];

        const ageGroupPlot = ModelActions.getInstance().getAgeGroup();

        const instantMin = ModelInstants.getInstance().getMinInstant();
        const instantMax = ModelInstants.getInstance().getMaxInstant();
        let incidenceMax = 0;
        for (let instant = instantMin; instant <= instantMax; instant += TimeUtil.MILLISECONDS_PER____DAY) {

            const categoryX = TimeUtil.formatCategoryDateFull(instant);

            let ageGroupRemovedVR1 = null;
            let ageGroupRemovedVR2 = null;
            let ageGroupRemovedVR3 = null;
            let ageGroupIncidenceR = null;
            let ageGroupAverageCasesR: number;
            let positivityRateR = null;
            let hospitalizationR = null;
            let icuR = null;
            let ageGroupCasesR = null;
            let reproductionR = null;
            let mobilityOther = null;
            const dataItem00 = BaseData.getInstance().findBaseDataItem(instant);
            if (dataItem00) {

                ageGroupRemovedVR1 = dataItem00.getVacc1(ageGroupPlot.getName()) / ageGroupPlot.getAbsValue();
                ageGroupRemovedVR2 = dataItem00.getVacc2(ageGroupPlot.getName()) / ageGroupPlot.getAbsValue();
                ageGroupRemovedVR3 = dataItem00.getVacc3(ageGroupPlot.getName()) / ageGroupPlot.getAbsValue();
                ageGroupIncidenceR = dataItem00.getIncidence(ageGroupPlot.getIndex());
                if (ageGroupIncidenceR && !Number.isNaN(ageGroupIncidenceR)) {
                    incidenceMax = Math.max(incidenceMax, ageGroupIncidenceR);
                }

                ageGroupAverageCasesR = dataItem00.getAverageCases(ageGroupPlot.getIndex());

                ageGroupCasesR = dataItem00.getCasesM1(ageGroupPlot.getIndex());
                positivityRateR = dataItem00.getAveragePositivity();
                mobilityOther = dataItem00.getAverageMobilityOther();

                // positivityRateR = new ModificationResolverDiscovery().getModification(dataItem00.getInstant(), 'INTERPOLATE').getOverall();
                // if (positivityRateR && !Number.isNaN(positivityRateR)) {
                //     positivityRateR; // TODO project this into a usable scale
                // }

                hospitalizationR = dataItem00.getHospitalization() / ageGroupPlot.getAbsValue();
                icuR = dataItem00.getIcu() / ageGroupPlot.getAbsValue();

                reproductionR = dataItem00.getReproduction(ageGroupPlot.getIndex()); // dataItem00.getAverageMobilityOther();//

            } else {
                // console.log('no data found', categoryX);
            }

            const item = {
                categoryX,
                ageGroupRemovedVR1,
                ageGroupRemovedVR2,
                ageGroupRemovedVR3,
                ageGroupIncidenceR,
                ageGroupAverageCasesR,
                positivityRateR,
                hospitalizationR,
                icuR,
                ageGroupCasesR,
                reproductionR,
                mobilityOther
            }
            baseData.push(item);

            chartData.push({
                categoryX
            })

        }

        if (this.chart.data.length === 0) {
            // console.log('primary heat value setup');
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

        // console.log(baseData);

        this.seriesAgeGroupRemovedVR1.getSeries().data = baseData;
        this.seriesAgeGroupRemovedVR2.getSeries().data = baseData;
        this.seriesAgeGroupRemovedVR3.getSeries().data = baseData;
        this.seriesAgeGroupIncidenceR.getSeries().data = baseData;
        this.seriesAgeGroupAverageCasesR.getSeries().data = baseData;
        this.seriesPositivityRateR.getSeries().data = baseData;
        this.seriesMobilityOther.getSeries().data = baseData;
        this.seriesHospitalizationR.getSeries().data = baseData;
        this.seriesIcuR.getSeries().data = baseData;
        this.seriesAgeGroupCasesR.getSeries().data = baseData;
        this.seriesReproductionR.getSeries().data = baseData;

    }

}

