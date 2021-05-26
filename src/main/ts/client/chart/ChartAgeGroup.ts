import { CategoryAxis, ColumnSeries, ValueAxis, XYChart, XYCursor } from "@amcharts/amcharts4/charts";
import { color, create, percent, Rectangle, useTheme } from "@amcharts/amcharts4/core";
import am4themes_animated from '@amcharts/amcharts4/themes/animated';
import am4themes_dark from '@amcharts/amcharts4/themes/dark';
import { AgeGroup } from '../../common/demographics/AgeGroup';
import { Demographics } from '../../common/demographics/Demographics';
import { IModificationValuesStrain } from '../../common/modification/IModificationValuesStrain';
import { Modifications } from '../../common/modification/Modifications';
import { ObjectUtil } from '../../util/ObjectUtil';
import { TimeUtil } from '../../util/TimeUtil';
import { CHART_MODE______KEY, ControlsConstants, IControlsChartDefinition } from '../gui/ControlsConstants';
import { SliderModification } from '../gui/SliderModification';
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

    protected readonly yAxisHeat: CategoryAxis;
    protected readonly yAxisModification: ValueAxis;

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
    protected readonly seriesAgeGroupExposed: ChartAgeGroupSeries;
    protected readonly seriesAgeGroupInfectious: ChartAgeGroupSeries;

    protected readonly seriesAgeGroupRemoved: ChartAgeGroupSeries;
    protected readonly seriesAgeGroupRemovedI: ChartAgeGroupSeries;
    protected readonly seriesAgeGroupRemovedV: ChartAgeGroupSeries;

    protected readonly seriesModification: ChartAgeGroupSeries;

    protected readonly seriesHeat: ColumnSeries;

    private readonly absTotal: number;
    private absValue: number; // the absolute value of the age-group currently displayed
    private ageGroupIndex: number;
    private modelData: any[];
    private ageGroupsWithTotal: AgeGroup[];
    private chartMode: CHART_MODE______KEY;

    private ageGroupMarker: Rectangle;
    private intervalHandle: number;

    // private xMin = -1;
    // private yMin = -1;
    // private xMax = -1;
    // private yMax = -1;

    private constructor() {

        useTheme(am4themes_dark);
        useTheme(am4themes_animated);

        this.absTotal = Demographics.getInstance().getAbsTotal();
        this.absValue = 0;
        this.ageGroupIndex = 10;
        this.modelData = [];
        this.chartMode = 'INCIDENCE';

        this.chart = create('chartDivAgeGroupPlot', XYChart);
        ChartUtil.getInstance().configureChartPadding(this.chart);
        this.chart.plotContainer.adapter.add('x', (x, target) => {
            if (this.xAxis.dataItems.length > 0) {
                const firstCategory = TimeUtil.formatCategoryDate(SliderModification.getInstance().getMinValue());
                const position = this.xAxis.categoryToPoint(firstCategory);
                SliderModification.getInstance().setSliderPadding((x as number) + position.x + 4);
            }
            return x;
        });

        const numberFormat = (10000).toLocaleString();
        this.chart.language.locale._thousandSeparator = numberFormat.indexOf('1.') >= -1 ? '.' : ',';
        this.chart.language.locale._decimalSeparator = numberFormat.indexOf('1.') >= -1 ? ',' : '.';


        this.chart.leftAxesContainer.layout = 'absolute';
        this.chart.bottomAxesContainer.layout = 'absolute';

        this.xAxis = this.chart.xAxes.push(new CategoryAxis());
        this.xAxis.dataFields.category = ChartAgeGroup.FIELD_CATEGORY_X;
        ChartUtil.getInstance().configureAxis(this.xAxis, 'Date');
        this.xAxis.renderer.labels.template.rotation = -90;
        this.xAxis.renderer.labels.template.horizontalCenter = 'right';
        this.xAxis.renderer.labels.template.verticalCenter = 'middle';

        this.xAxis.tooltip.label.rotation = -90;
        this.xAxis.tooltip.label.horizontalCenter = 'right';
        this.xAxis.tooltip.label.verticalCenter = 'middle';

        this.yAxisPlotAbsolute = this.chart.yAxes.push(new ValueAxis());
        ChartUtil.getInstance().configureAxis(this.yAxisPlotAbsolute, 'population');
        this.yAxisPlotAbsolute.rangeChangeDuration = 0;
        this.yAxisPlotAbsolute.strictMinMax = true;
        this.yAxisPlotAbsolute.visible = false;
        this.yAxisPlotAbsolute.renderer.grid.template.disabled = true;
        this.yAxisPlotAbsolute.tooltip.disabled = true;

        this.yAxisPlotRelative = this.chart.yAxes.push(new ValueAxis());
        ChartUtil.getInstance().configureAxis(this.yAxisPlotRelative, 'Population %');
        this.yAxisPlotRelative.visible = false;
        this.yAxisPlotRelative.renderer.grid.template.disabled = true;
        this.yAxisPlotRelative.rangeChangeDuration = 0;
        this.yAxisPlotRelative.strictMinMax = true;
        this.yAxisPlotRelative.extraMax = 0.00;
        this.yAxisPlotRelative.min = 0.00;
        this.yAxisPlotRelative.max = 1.01; // some extra required, or 100% label will not show

        this.yAxisPlotRelative.renderer.labels.template.adapter.add('text', (value, target) => {
            if (value) {
                value = value.replace(this.chart.language.locale._thousandSeparator, '');
                value = value.replace(this.chart.language.locale._decimalSeparator, '.');
                return Math.round(parseFloat(value) * 100) + '%';
            } else {
                return value;
            }
        });
        this.yAxisPlotRelative.tooltip.label.adapter.add('text', (value, target) => {
            if (value) {
                value = value.replace(this.chart.language.locale._thousandSeparator, '');
                value = value.replace(this.chart.language.locale._decimalSeparator, '.');
                return Math.round(parseFloat(value) * 100) + '%';
            } else {
                return value;
            }
        });

        // incidence axis
        this.yAxisPlotIncidence = this.chart.yAxes.push(new ValueAxis());
        this.yAxisPlotIncidence.rangeChangeDuration = 0;
        this.yAxisPlotIncidence.strictMinMax = true;
        this.yAxisPlotIncidence.rangeChangeDuration = 0;
        ChartUtil.getInstance().configureAxis(this.yAxisPlotIncidence, '7-day incidence / ' + (100000).toLocaleString());

        // modification indicator axis
        this.yAxisModification = this.chart.yAxes.push(new ValueAxis());
        this.yAxisModification.strictMinMax = true;
        this.yAxisModification.rangeChangeDuration = 0;
        ChartUtil.getInstance().configureAxis(this.yAxisModification, 'mods');
        this.yAxisModification.renderer.labels.template.adapter.add('text', (value) => {
            if (value) {
                // console.log('value', value);
                value = value.replace(this.chart.language.locale._thousandSeparator, '');
                value = value.replace(this.chart.language.locale._decimalSeparator, '.');
                const parsed = parseFloat(value);
                if (parsed !== 0 && this.seriesModification.isPercent()) {
                    return Math.round(parseFloat(value) * 100) + '%';
                } else {
                    return parsed.toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FIXED);
                }
            } else {
                return value;
            }
        });

        this.seriesAgeGroupIncidence = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotIncidence,
            baseLabel: 'incidence',
            valueField: 'ageGroupIncidence',
            colorKey: 'INCIDENCE',
            strokeWidth: 2,
            dashed: false,
            locationOnPath: 0.10,
            labelled: true,
            percent: false
        });
        this.seriesAgeGroupIncidenceByStrain = new Map();

        this.seriesAgeGroupCases = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotAbsolute,
            baseLabel: 'cases',
            valueField: 'ageGroupCases',
            colorKey: 'CASES',
            strokeWidth: 2,
            dashed: false,
            locationOnPath: 0.50,
            labelled: true,
            percent: false
        });
        this.seriesAgeGroupSusceptible = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotRelative,
            baseLabel: 'susceptible',
            valueField: 'ageGroupSusceptible',
            colorKey: 'SUSCEPTIBLE',
            strokeWidth: 2,
            dashed: false,
            locationOnPath: 0.05,
            labelled: true,
            percent: true
        });
        this.seriesAgeGroupExposed = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotRelative,
            baseLabel: 'exposed',
            valueField: 'ageGroupExposed',
            colorKey: 'EXPOSED',
            strokeWidth: 2,
            dashed: false,
            locationOnPath: 0.25,
            labelled: true,
            percent: true
        });
        this.seriesAgeGroupInfectious = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotRelative,
            baseLabel: 'infectious',
            valueField: 'ageGroupInfectious',
            colorKey: 'INFECTIOUS',
            strokeWidth: 2,
            dashed: false,
            locationOnPath: 0.45,
            labelled: true,
            percent: true
        });
        this.seriesAgeGroupRemoved = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotRelative,
            baseLabel: 'removed',
            valueField: 'ageGroupRemoved',
            colorKey: 'REMOVED',
            strokeWidth: 2,
            dashed: false,
            locationOnPath: 0.45,
            labelled: true,
            percent: true
        });
        this.seriesAgeGroupRemovedI = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotRelative,
            baseLabel: 'recovered',
            valueField: 'ageGroupRemovedI',
            colorKey: 'REMOVED',
            strokeWidth: 1,
            dashed: true,
            locationOnPath: 0.65,
            labelled: true,
            percent: true
        });
        this.seriesAgeGroupRemovedV = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisPlotRelative,
            baseLabel: 'vaccinated',
            valueField: 'ageGroupRemovedV',
            colorKey: 'REMOVED',
            strokeWidth: 1,
            dashed: true,
            locationOnPath: 0.85,
            labelled: true,
            percent: true
        });
        this.seriesModification = new ChartAgeGroupSeries({
            chart: this.chart,
            yAxis: this.yAxisModification,
            baseLabel: '',
            valueField: 'modValueY',
            colorKey: 'TIME',
            strokeWidth: 2,
            dashed: false,
            locationOnPath: 0.70,
            labelled: true,
            percent: true
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

        /**
         * heat axis
         */
        this.yAxisHeat = this.chart.yAxes.push(new CategoryAxis());
        this.yAxisHeat.dataFields.category = ChartAgeGroup.FIELD_CATEGORY_Y;
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
        this.seriesHeat.sequencedInterpolation = true;
        this.seriesHeat.defaultState.transitionDuration = 3000;
        this.seriesHeat.tooltip.disabled = false;
        this.seriesHeat.cursorTooltipEnabled = false; // be sure the contact chart tooltip is hidden from the cursor
        ChartUtil.getInstance().configureSeries(this.seriesHeat, ControlsConstants.COLOR____FONT, false);
        this.seriesHeat.events.on("ready", () => {
            // TODO implement or remove
        });

        this.ageGroupMarker = this.chart.plotContainer.createChild(Rectangle);
        // this.ageGroupMarker.stroke = color(ControlsConstants.COLOR____FONT);
        this.ageGroupMarker.strokeWidth = 0;
        this.ageGroupMarker.fillOpacity = 1;
        this.ageGroupMarker.fill = color(ControlsConstants.COLOR____FONT);
        this.ageGroupMarker.zIndex = 100;

        const columnTemplate = this.seriesHeat.columns.template;
        columnTemplate.strokeWidth = 0;
        // columnTemplate.fillOpacity = 0.5;
        // columnTemplate.strokeOpacity = 0.2;
        // columnTemplate.stroke = color('#ff0000');
        columnTemplate.tooltipText = `{${ChartAgeGroup.FIELD_CATEGORY_X}}, {${ChartAgeGroup.FIELD_CATEGORY_Y}}: {value.formatNumber("#,###.")}`; // "#,###.00"
        columnTemplate.width = percent(105);
        columnTemplate.height = percent(105);
        columnTemplate.events.on('hit', e => {
            const index = e.target.dataItem.dataContext[ChartAgeGroup.FIELD______INDEX];
            this.setSeriesAgeGroup(index);
        });

        this.seriesHeat.heatRules.push({
            target: columnTemplate,
            property: 'fill',
            min: color(ChartUtil.getInstance().toColor(0)),
            max: color(ChartUtil.getInstance().toColor(1)),
            minValue: 0,
            maxValue: 1,
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
                filePrefix: 'timeline_' + Date.now()
            };
        });

        // TODO probably needs to be a specific type
        document.getElementById('chartModeIncidenceDiv').addEventListener('click', () => {
            this.setChartMode('INCIDENCE');
        });
        document.getElementById('chartModeSeirDiv').addEventListener('click', () => {
            this.setChartMode('SEIR');
        });
        this.setChartMode('INCIDENCE');

    }

    exportToPng(): void {
        this.chart.exporting.export("png");
    }

    async setSeriesAgeGroup(ageGroupIndex: number): Promise<void> {

        this.ageGroupIndex = ageGroupIndex;
        const ageGroup = this.ageGroupsWithTotal[this.ageGroupIndex];
        this.absValue = ageGroup.getAbsValue();

        await this.renderModelData();

        clearInterval(this.intervalHandle);
        this.intervalHandle = setInterval(() => {
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
        this.seriesAgeGroupCases.setSeriesNote(ageGroup.getName());

        this.seriesAgeGroupSusceptible.setSeriesNote(ageGroup.getName());
        this.seriesAgeGroupExposed.setSeriesNote(ageGroup.getName());
        this.seriesAgeGroupInfectious.setSeriesNote(ageGroup.getName());
        this.seriesAgeGroupRemoved.setSeriesNote(ageGroup.getName());
        this.seriesAgeGroupRemovedI.setSeriesNote(ageGroup.getName());
        this.seriesAgeGroupRemovedV.setSeriesNote(ageGroup.getName());

        const modificationValuesStrain = Modifications.getInstance().findModificationsByType('STRAIN').map(m => m.getModificationValues() as IModificationValuesStrain);
        modificationValuesStrain.forEach(strainValues => {
            // this call implicitly updates the base label, explicity updates series label
            this.getOrCreateSeriesAgeGroupIncidenceStrain(strainValues).setSeriesNote(ageGroup.getName());
        });

    }

    getOrCreateSeriesAgeGroupIncidenceStrain(strainValues: IModificationValuesStrain): ChartAgeGroupSeries {
        if (!this.seriesAgeGroupIncidenceByStrain.has(strainValues.id)) {
            this.seriesAgeGroupIncidenceByStrain.set(strainValues.id, new ChartAgeGroupSeries({
                chart: this.chart,
                yAxis: this.yAxisPlotIncidence,
                baseLabel: strainValues.name,
                valueField: `ageGroupIncidence${strainValues.id}`,
                colorKey: 'INCIDENCE',
                strokeWidth: 1,
                dashed: true,
                locationOnPath: 0.3,
                labelled: true,
                percent: false
            }));
        }
        const seriesAgeGroup = this.seriesAgeGroupIncidenceByStrain.get(strainValues.id);
        seriesAgeGroup.setBaseLabel(strainValues.name);
        seriesAgeGroup.getSeries().visible = this.chartMode === 'INCIDENCE';
        return seriesAgeGroup;
    }

    setSeriesSeirVisible(visible: boolean): void {
        this.yAxisPlotRelative.visible = visible;
        this.yAxisPlotRelative.renderer.grid.template.disabled = !visible;
        this.yAxisPlotRelative.tooltip.disabled = !visible;
        this.seriesAgeGroupSusceptible.getSeries().visible = visible;
        this.seriesAgeGroupExposed.getSeries().visible = visible;
        this.seriesAgeGroupInfectious.getSeries().visible = visible;
        this.seriesAgeGroupRemoved.getSeries().visible = visible;
        this.seriesAgeGroupRemovedI.getSeries().visible = visible;
        this.seriesAgeGroupRemovedV.getSeries().visible = visible;
    }
    setSeriesIncidenceVisible(visible: boolean): void {

        this.yAxisPlotIncidence.visible = visible;
        this.yAxisPlotIncidence.renderer.grid.template.disabled = !visible;
        this.yAxisPlotIncidence.tooltip.disabled = !visible;
        this.seriesAgeGroupIncidence.getSeries().visible = visible;
        this.seriesAgeGroupCases.getSeries().visible = visible;

        // set everything to invisible
        this.seriesAgeGroupIncidenceByStrain.forEach(seriesAgeGroupIncidence => {
            seriesAgeGroupIncidence.getSeries().visible = false;
        });
        const modificationValuesStrain = Modifications.getInstance().findModificationsByType('STRAIN').map(m => m.getModificationValues() as IModificationValuesStrain);
        // specific incidence makes sense only if there is more than one strain
        if (visible && modificationValuesStrain.length > 1) {
            // turn all active strain back on
            modificationValuesStrain.forEach(strainValues => {
                console.log('strain to visible', strainValues.name)
                this.getOrCreateSeriesAgeGroupIncidenceStrain(strainValues).getSeries().visible = true;
            });
        }

    }

    setChartMode(chartMode: CHART_MODE______KEY): void {

        this.chartMode = chartMode;
        if (this.chartMode === 'INCIDENCE') {

            this.setSeriesIncidenceVisible(true);
            this.setSeriesSeirVisible(false);

        } else if (this.chartMode === 'SEIR') {

            this.setSeriesIncidenceVisible(false);
            this.setSeriesSeirVisible(true);

        }

    }

    /**
     * pushes all modifications to SliderModification, where they will be drawn on the time, depending on actual type
     * @param key
     */
    async showModifications(modificationDefinition: IControlsChartDefinition, modificationData: IModificationData[]): Promise<void> {

        // TODO probably needs to move to separate method
        if (modificationDefinition) {

            this.seriesModification.setPercent(modificationDefinition.percent);
            this.seriesModification.setBaseLabel(modificationDefinition.text);
            this.seriesModification.setSeriesNote('');
            this.seriesModification.getSeries().fill = color(modificationDefinition.color);
            this.seriesModification.getSeries().fillOpacity = 0.20;
            ChartUtil.getInstance().configureAgeGroupSeries(this.seriesModification, modificationDefinition.color, modificationDefinition.useObjectColors);

            this.yAxisModification.min = modificationDefinition.min;
            this.yAxisModification.max = modificationDefinition.max;

            this.seriesModification.getSeries().stroke = color(modificationDefinition.color);
            this.seriesModification.getSeries().data = modificationData;

            // console.log('modificationData', modificationData);

        } else {
            // TODO reset display
        }

    }

    async acceptModelData(modelData: any[]): Promise<void> {

        // console.log('modelData', modelData);

        const modificationValuesStrain = Modifications.getInstance().findModificationsByType('STRAIN').map(m => m.getModificationValues() as IModificationValuesStrain);
        modificationValuesStrain.forEach(strainValues => {
            // be sure there is a series for each strain
            this.getOrCreateSeriesAgeGroupIncidenceStrain(strainValues);
        });

        // detach from thread, be sure series visibilities are straight
        requestAnimationFrame(() => {
            this.setChartMode(this.chartMode);
        });


        this.modelData = modelData;
        this.ageGroupsWithTotal = [...Demographics.getInstance().getAgeGroups(), new AgeGroup(Demographics.getInstance().getAgeGroups().length, {
            name: 'TOTAL',
            pG: Demographics.getInstance().getAbsTotal(),
            vacc: 0
        })];

        let maxIncidence = 0;
        for (const dataItem of this.modelData) {
            this.ageGroupsWithTotal.forEach(ageGroupHeat => {
                maxIncidence = Math.max(maxIncidence, dataItem[ageGroupHeat.getName() + '_INCIDENCE']);
            });
        }
        this.yAxisPlotIncidence.min = 0;
        this.yAxisPlotIncidence.max = maxIncidence * 1.05;
        this.yAxisPlotIncidence.start = 0;
        this.yAxisPlotIncidence.end = 1;

        await this.setSeriesAgeGroup(this.ageGroupIndex);

    }

    async renderModelData(): Promise<void> {

        const plotData: any[] = [];
        const heatData: any[] = [];

        const modificationValuesStrain = Modifications.getInstance().findModificationsByType('STRAIN').map(m => m.getModificationValues() as IModificationValuesStrain);

        const ageGroupPlot = this.ageGroupsWithTotal[this.ageGroupIndex];
        for (const dataItem of this.modelData) {

            // data independent from sub-strains
            const ageGroupSusceptible = dataItem[`${ageGroupPlot.getName()}_SUSCEPTIBLE`];
            const ageGroupExposed = dataItem[`${ageGroupPlot.getName()}_EXPOSED`];
            const ageGroupInfectious = dataItem[`${ageGroupPlot.getName()}_INFECTIOUS`];
            const ageGroupRemovedI = dataItem[`${ageGroupPlot.getName()}_REMOVED_I`];
            const ageGroupRemovedV = dataItem[`${ageGroupPlot.getName()}_REMOVED_V`];
            const ageGroupIncidence = dataItem[`${ageGroupPlot.getName()}_INCIDENCE`];
            const ageGroupCases = dataItem[`${ageGroupPlot.getName()}_CASES`];

            const item = {
                categoryX: dataItem[ChartAgeGroup.FIELD_CATEGORY_X],
                ageGroupSusceptible,
                ageGroupExposed,
                ageGroupInfectious,
                ageGroupRemoved: ageGroupRemovedI + ageGroupRemovedV,
                ageGroupRemovedI,
                ageGroupRemovedV,
                ageGroupIncidence,
                ageGroupCases
            }

            // TODO instead of rebuilding the data every time, it maybe could be much easier to change the value fields on the age specific series
            modificationValuesStrain.forEach(modificationValueStrain => {
                item[`ageGroupIncidence${modificationValueStrain.id}`] = dataItem[`${ageGroupPlot.getName()}_INCIDENCE_${modificationValueStrain.id}`];
            });

            plotData.push(item);

        }

        let maxValue = 0;
        const randomVd = Math.random() * 0.00001;
        for (const dataItem of this.modelData) {

            this.ageGroupsWithTotal.forEach(ageGroupHeat => {

                const value = dataItem[ageGroupHeat.getName() + '_INCIDENCE'];
                heatData.push({
                    categoryX: dataItem[ChartAgeGroup.FIELD_CATEGORY_X],
                    categoryY: ageGroupHeat.getName(),
                    index: ageGroupHeat.getIndex(),
                    value: value + randomVd
                });
                if (value > maxValue) {
                    maxValue = value;
                }

            });

        }

        const chartData = [...plotData, ...heatData];

        const heatRule = this.seriesHeat.heatRules.getIndex(0) as any;
        heatRule.minValue = 0;
        heatRule.maxValue = maxValue;

        // console.log('chartData', chartData);

        if (this.chart.data.length === chartData.length) {
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
