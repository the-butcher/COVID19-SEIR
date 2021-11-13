import { LineSeries, StepLineSeries, ValueAxis, XYChart } from "@amcharts/amcharts4/charts";
import { Label, useTheme } from "@amcharts/amcharts4/core";
import am4themes_animated from '@amcharts/amcharts4/themes/animated';
import am4themes_dark from '@amcharts/amcharts4/themes/dark';
import { COMPARTMENT__COLORS, ControlsConstants } from '../gui/ControlsConstants';
import { ObjectUtil } from './../../util/ObjectUtil';
import { ILabellingDefinition } from './../gui/ControlsConstants';
import { ChartAgeGroup } from './ChartAgeGroup';
import { ChartUtil } from './ChartUtil';


export interface ISeriesLabels {
    tooltip: boolean;
    pathtip: boolean;
}


export interface IChartAgeGroupSeriesParams {
    chart: XYChart;
    yAxis: ValueAxis;
    title: string;
    baseLabel: string;
    valueField: string;
    colorKey: COMPARTMENT__COLORS;
    strokeWidth: number;
    dashed: boolean;
    labels: ISeriesLabels;
    locationOnPath: number;
    stacked: boolean;
    legend: boolean;
    labellingDefinition: ILabellingDefinition;
    seriesConstructor: () => LineSeries | StepLineSeries;
}

/**
 * helper type for a single age-group-chart line series
 *
 * @author h.fleischer
 * @since 16.05.2021
 */
export class ChartAgeGroupSeries {

    private readonly series: LineSeries | StepLineSeries;

    private baseLabel: string;
    private readonly seriesLabel: Label;

    private readonly valueField: string;
    private readonly locationOnPath: number;
    private intervalHandle: number;

    private labellingDefinition: ILabellingDefinition;

    private hasLegend: boolean;
    private boundSeries: ChartAgeGroupSeries[];

    private visible: boolean;

    constructor(params: IChartAgeGroupSeriesParams) {

        useTheme(am4themes_dark);
        useTheme(am4themes_animated);

        this.visible = true;

        this.baseLabel = params.baseLabel;
        this.valueField = params.valueField;
        this.locationOnPath = params.locationOnPath;
        this.labellingDefinition = params.labellingDefinition;

        this.series = params.chart.series.push(params.seriesConstructor());
        this.series.showOnInit = false;
        this.boundSeries = [];
        this.hasLegend = params.legend;

        this.seriesLabel = this.series.createChild(Label);
        this.seriesLabel.fontFamily = ControlsConstants.FONT_FAMILY;
        this.seriesLabel.fontSize = ControlsConstants.FONT_SIZE - 2;
        this.seriesLabel.strokeOpacity = 0;
        this.seriesLabel.fillOpacity = 1;
        this.seriesLabel.padding(0, 0, 5, 0);
        this.seriesLabel.visible = false;

        this.series.hiddenState.transitionDuration = 0;
        this.series.defaultState.transitionDuration = 0;
        this.series.interpolationDuration = 0;

        this.series.yAxis = params.yAxis;
        this.series.dataFields.categoryX = ChartAgeGroup.FIELD_CATEGORY_X;
        this.series.dataFields.valueY = params.valueField;

        this.series.sequencedInterpolation = false;

        this.series.hiddenInLegend = true; // !params.legend;
        this.setStacked(params.stacked);
        this.series.strokeWidth = params.strokeWidth;
        if (params.dashed) {
            this.series.strokeDasharray = params.strokeWidth * 2 + ',' + params.strokeWidth * 2;
        }
        // this.series.strokeOpacity = 1.0;
        this.series.fontFamily = ControlsConstants.FONT_FAMILY;
        this.series.fontSize = ControlsConstants.FONT_SIZE;
        ChartUtil.getInstance().configureAgeGroupSeries(this, ControlsConstants.COLORS[params.colorKey], true);

        if (this.series instanceof LineSeries) {
            (this.series as LineSeries).adapter.add('tooltipText', (value, target) => {
                const indexCurr = target.tooltipDataItem.index;
                if (indexCurr >= 0 && target.dataItems.values.length > indexCurr) {
                    const itemCurr = target.dataItems.values[indexCurr];
                    const valueCurr = itemCurr.dataContext[this.valueField];
                    return valueCurr ? `${this.seriesLabel.text}: ${this.labellingDefinition.format(valueCurr)}` : undefined;
                } else {
                    // console.log('no index found', this.series.name);
                    return value;
                }
            });
        }
        // this.series.tooltip.label.adapter.add("text", (value, target) {
        //     if (target.dataItem && target.dataItem.valueY == 0) {
        //       return "";
        //     }
        //     else {
        //       return text;
        //     }
        //   });

        this.series.tooltip.disabled = !params.labels.tooltip;
        this.seriesLabel.disabled =  !params.labels.pathtip;

        this.getSeries().events.on('hidden', () => {
            // console.log('hiding', this.seriesLabel);
            this.visible = false;
            this.boundSeries.forEach(series => {
                series.getSeries().hide();
            });
        });
        this.getSeries().events.on('shown', () => {
            // console.log('showing', this.seriesLabel);
            this.visible = true;
            this.boundSeries.forEach(series => {
                series.getSeries().show();
            });
        });

        // this.series.events.on('ready', () => {
        //     // do nothing, but keep handler to know where to find it
        // });

        this.series.name = params.title;

        // this.series.segments.template.events.on('over', () => {
        //     this.series.tooltip.disabled = false;
        // });
        // this.series.segments.template.events.on('out', () => {
        //     this.series.tooltip.disabled = true;
        // });

    }

    /**
     * turns both legend and series on/or off
     * @param visible
     */
    setVisible(visible: boolean): void {
        this.series.hiddenInLegend = !visible || !this.hasLegend;
        this.series.visible = visible ? this.visible : false;
    }

    setStacked(stacked: boolean): void {

        this.series.stacked = stacked;

        this.series.stacked = stacked;
        this.series.fillOpacity = stacked ? 0.7 : 0.0;
        this.series.strokeOpacity = stacked ? 0.7 : 1.0;

        // this.series.segments.template.interactionsEnabled = stacked;

        this.series.tooltip.disabled = stacked;

    }

    bindToLegend(bindableSeries: ChartAgeGroupSeries): void {
        this.boundSeries.push(bindableSeries);
    }

    getValueField(): string {
        return this.valueField;
    }

    setLabellingDefinition(labellingDefinition: ILabellingDefinition): void {
        this.labellingDefinition = labellingDefinition;
    }

    getLabellingDefinition(): ILabellingDefinition {
        return this.labellingDefinition;
    }

    setBaseLabel(baseLabel: string) {
        this.baseLabel = baseLabel;
    }

    setSeriesNote(seriesNote: string) {

        this.seriesLabel.text = this.baseLabel;
        if (ObjectUtil.isNotEmpty(seriesNote)) {
            this.seriesLabel.text = this.seriesLabel.text + ' (' + seriesNote + ')';
        }

        clearInterval(this.intervalHandle);
        this.intervalHandle = window.setInterval(() => {
            if (this.series.segments.getIndex(0)?.strokeSprite) {
                this.seriesLabel.path = this.series.segments.getIndex(0).strokeSprite.path;
                this.seriesLabel.locationOnPath = this.locationOnPath;
                this.seriesLabel.visible = true;
                this.series.segments.getIndex(0).strokeSprite.events.on('propertychanged', e => {
                    if (e.property === 'path') {
                        this.seriesLabel.path = this.series.segments.getIndex(0).strokeSprite.path;
                        this.seriesLabel.locationOnPath = this.locationOnPath;
                    }
                });
                clearInterval(this.intervalHandle);
            }
        }, 100);

    }

    getSeriesLabel(): Label {
        return this.seriesLabel;
    }

    getSeries(): LineSeries {
        return this.series;
    }

}