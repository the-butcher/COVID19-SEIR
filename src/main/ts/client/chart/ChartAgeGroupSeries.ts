import { LineSeries, StepLineSeries, ValueAxis, XYChart } from "@amcharts/amcharts4/charts";
import { color, Label, useTheme } from "@amcharts/amcharts4/core";
import am4themes_animated from '@amcharts/amcharts4/themes/animated';
import am4themes_dark from '@amcharts/amcharts4/themes/dark';
import { COMPARTMENT__COLORS, ControlsConstants } from '../gui/ControlsConstants';
import { ModelConstants } from '../../model/ModelConstants';
import { ChartAgeGroup } from './ChartAgeGroup';
import { ChartUtil } from './ChartUtil';

export interface IChartAgeGroupSeriesParams {
    chart: XYChart;
    yAxis: ValueAxis;
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
    private readonly seriesLabel: Label;
    private readonly valueField: string;
    private readonly locationOnPath: number;
    private intervalHandle: number;
    private percent: boolean;

    constructor(params: IChartAgeGroupSeriesParams) {

        useTheme(am4themes_dark);
        useTheme(am4themes_animated);

        this.valueField = params.valueField;
        this.locationOnPath = params.locationOnPath;
        this.percent = params.percent;

        this.series = params.chart.series.push(new LineSeries());
        this.series.showOnInit = false;

        this.seriesLabel = this.series.createChild(Label);
        this.seriesLabel.fontFamily = ControlsConstants.FONT_FAMILY;
        this.seriesLabel.fontSize = ControlsConstants.FONT_SIZE - 2;
        this.seriesLabel.strokeOpacity = 0;
        this.seriesLabel.fillOpacity = 1;
        this.seriesLabel.padding(0, 0, 5, 0);

        this.series.hiddenState.transitionDuration = 0;
        this.series.defaultState.transitionDuration = 0;
        this.series.interpolationDuration = 0;

        this.series.yAxis = params.yAxis;
        this.series.dataFields.categoryX = ChartAgeGroup.FIELD_CATEGORY_X;
        this.series.dataFields.valueY = params.valueField;

        // this.series.name = params.valueField;
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

        // this.series.tooltipText = this.seriesLabel.text + ': {' + params.valueField + '.formatNumber("#,###.")}'; // "#,###.00"
        this.series.adapter.add('tooltipText', (value, target) => {
            const indexCurr = target.tooltipDataItem.index;
            if (this.percent && indexCurr >= 0 && target.dataItems.values.length > indexCurr) {
                const itemCurr = target.dataItems.values[indexCurr];
                const valueCurr = itemCurr.dataContext[this.valueField];
                return this.seriesLabel.text + ': ' + (valueCurr * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_2) + '%';
            } else {
                return this.seriesLabel.text + ': {' + params.valueField + '.formatNumber("#,###.")}'; // "#,###.00";
            }
        });

        this.series.events.on('ready', () => {
            // remove clip-path so thicker line series appear in full width around y==0
            (this.series.element.node.firstChild as SVGGElement).setAttributeNS(null, 'clip-path', '');
            if (params.labelled) {
                this.series.segments.getIndex(0).strokeSprite.events.on('propertychanged', e => {
                    if (e.property === 'path') {
                        this.seriesLabel.path = this.series.segments.getIndex(0).strokeSprite.path;
                        this.seriesLabel.locationOnPath = params.locationOnPath;
                    }
                });
            };
        });

    }

    setPercent(percent: boolean): void {
        this.percent = percent;
    }

    setSeriesLabel(seriesLabel: string) {

        this.seriesLabel.text = seriesLabel;
        this.series.name = seriesLabel;

        clearInterval(this.intervalHandle);
        this.intervalHandle = setInterval(() => {
            if (this.series.segments.getIndex(0)?.strokeSprite) {
                this.seriesLabel.path = this.series.segments.getIndex(0).strokeSprite.path;
                this.seriesLabel.locationOnPath = this.locationOnPath;
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