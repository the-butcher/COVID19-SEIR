import { LineSeries, StepLineSeries, ValueAxis, XYChart } from "@amcharts/amcharts4/charts";
import { Label, useTheme } from "@amcharts/amcharts4/core";
import am4themes_animated from '@amcharts/amcharts4/themes/animated';
import am4themes_dark from '@amcharts/amcharts4/themes/dark';
import { COMPARTMENT__COLORS, ControlsConstants } from '../gui/ControlsConstants';
import { ObjectUtil } from './../../util/ObjectUtil';
import { ILabellingDefinition } from './../gui/ControlsConstants';
import { ChartAgeGroup } from './ChartAgeGroup';
import { ChartUtil } from './ChartUtil';

export interface IChartAgeGroupSeriesParams {
    chart: XYChart;
    yAxis: ValueAxis;
    baseLabel: string;
    valueField: string;
    colorKey: COMPARTMENT__COLORS;
    strokeWidth: number;
    dashed: boolean;
    labelled: boolean;
    locationOnPath: number;
    percent: boolean
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

    constructor(params: IChartAgeGroupSeriesParams) {

        useTheme(am4themes_dark);
        useTheme(am4themes_animated);

        this.baseLabel = params.baseLabel;
        this.valueField = params.valueField;
        this.locationOnPath = params.locationOnPath;
        this.labellingDefinition = params.percent ? ControlsConstants.LABEL_PERCENT__FLOAT_2 : ControlsConstants.LABEL_ABSOLUTE_FLOAT_2;

        this.series = params.chart.series.push(new LineSeries());
        this.series.showOnInit = false;


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

        this.series.stacked = false;
        this.series.fillOpacity = 0.0;
        this.series.strokeWidth = params.strokeWidth;
        if (params.dashed) {
            this.series.strokeDasharray = params.strokeWidth * 2 + ',' + params.strokeWidth * 2;
        }
        this.series.strokeOpacity = 1.0;
        this.series.fontFamily = ControlsConstants.FONT_FAMILY;
        this.series.fontSize = ControlsConstants.FONT_SIZE;
        ChartUtil.getInstance().configureAgeGroupSeries(this, ControlsConstants.COLORS[params.colorKey], true);

        this.series.adapter.add('tooltipText', (value, target) => {
            const indexCurr = target.tooltipDataItem.index;
            if (indexCurr >= 0 && target.dataItems.values.length > indexCurr) {
                const itemCurr = target.dataItems.values[indexCurr];
                const valueCurr = itemCurr.dataContext[this.valueField];
                return valueCurr ? `${this.seriesLabel.text}: ${this.labellingDefinition.format(valueCurr)}` : undefined;
            } else {
                return value;
            }
        });

        this.series.tooltip.disabled = !params.labelled;

        this.series.events.on('ready', () => {

        });

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
        this.series.name = seriesNote;

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