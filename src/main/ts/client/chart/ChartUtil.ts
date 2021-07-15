import { Legend } from '@amcharts/amcharts4/charts';
import { Axis, Chart, Series, XYChart } from '@amcharts/amcharts4/charts';
import { color } from '@amcharts/amcharts4/core';
import { ObjectUtil } from '../../util/ObjectUtil';
import { ControlsConstants, IHeatmapColorDefinition, ILabellingDefinition } from './../gui/ControlsConstants';
import { ChartAgeGroupSeries } from './ChartAgeGroupSeries';

/**
 * utility type isolating functionality used in multiple places, like setting up axes, tooltips, ...
 *
 * @author h.fleischer
 * @since 16.05.2021
 */
export class ChartUtil {

    static readonly PADDING_17 = '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0';


    static getInstance(): ChartUtil {
        if (ObjectUtil.isEmpty(this.instance)) {
            this.instance = new ChartUtil();
        }
        return this.instance;
    }
    private static instance: ChartUtil;

    private readonly colorRepo: string[] = [];
    private readonly separatorThousand: string;
    private readonly separatorDecimal: string;

    private constructor() {
        const numberFormat = (10000).toLocaleString();
        this.separatorThousand = numberFormat.indexOf('1.') >= -1 ? '.' : ',';
        this.separatorDecimal = numberFormat.indexOf('1.') >= -1 ? ',' : '.';
    }

    configureSeparators(chart: XYChart): void {
        chart.language.locale._thousandSeparator = this.separatorThousand;
        chart.language.locale._decimalSeparator = this.separatorDecimal;
    }

    formatLabelOrTooltipValue = (value: string, labellingDefinition: ILabellingDefinition) => {
        if (value) {
            value = value.replace(this.separatorThousand, '');
            value = value.replace(this.separatorDecimal, '.');
            return labellingDefinition.format(parseFloat(value)); // this.formatLabelOrTooltipParsed(parseFloat(value), percent);
        } else {
            return value;
        }
    }


    formatPercentage(value: number): string {
        const raw = (value * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_2) + '%';
        return '       '.substr(0, 7 - raw.length) + raw;
    }

    formatContactLine(caption: string, value: string): string {
        return `${caption}:${ChartUtil.PADDING_17.substr(caption.length + value.length)}${value}`;
    }

    toColor(value: number, colorDef: IHeatmapColorDefinition): string {
        const valueKey = `${colorDef.id}_${value}` ;
        if (ObjectUtil.isEmpty(this.colorRepo[valueKey])) {
            this.colorRepo[valueKey] = colorDef.getHeatColor(value); // new Color(0.0, 0.0, Math.min(1.0, valueSpc / 100)).getHex();
        }
        return this.colorRepo[valueKey];

    }

    configureAgeGroupSeries(series: ChartAgeGroupSeries, hex: string, useObjectColors: boolean): void {
        series.getSeriesLabel().fill = color(hex).brighten(0.5);
        this.configureSeries(series.getSeries(), hex, useObjectColors);
    }

    configureSeries(series: Series, hex: string, useObjectColors: boolean): void {

        series.tooltip.disabled = false;

        series.stroke = color(hex);
        series.fill = color(hex);

        series.tooltip.getStrokeFromObject = false;
        if (useObjectColors) {
            series.tooltip.getFillFromObject = true;
            series.tooltip.background.opacity = 0.85;
        } else {
            series.tooltip.getFillFromObject = false;
            series.tooltip.background.stroke = color(ControlsConstants.COLOR____FONT);
            series.tooltip.background.fill = color(ControlsConstants.COLOR______BG);
        }

        series.tooltip.background.strokeWidth = 0.25;
        series.tooltip.background.cornerRadius = 0;
        series.tooltip.background.filters.clear();

        series.tooltip.label.fontFamily = ControlsConstants.FONT_FAMILY;
        series.tooltip.label.fontSize = ControlsConstants.FONT_SIZE - 2;
        series.tooltip.label.fill = color(ControlsConstants.COLOR____FONT);
        series.tooltip.label.paddingLeft = 3;
        series.tooltip.label.paddingTop = 0;
        series.tooltip.label.paddingBottom = 0;
        series.tooltip.label.paddingRight = 1;

        series.sequencedInterpolation = true;

        series.tooltip.exportable = true;

    }

    configureLegend(chart: Chart): void {

        chart.legend = new Legend();
        chart.legend.fontFamily = ControlsConstants.FONT_FAMILY;
        chart.legend.fontSize = ControlsConstants.FONT_SIZE - 3;
        // chart.legend.position = 'left'; // items in vertical order
        // chart.legend.reverseOrder = true; // reverse, or active would be bottom
        chart.legend.markers.template.width = 16; // smaller boxes
        chart.legend.markers.template.height = 12;
        chart.legend.markers.template.fillOpacity = 0.7;
        chart.legend.maxWidth = 1000; // let the label be long if required
        chart.legend.itemContainers.template.paddingTop = 3; // have items closer together
        chart.legend.itemContainers.template.paddingBottom = 3;

    }

    configureChartPadding(chart: Chart): void {
        chart.paddingTop = 12;
        chart.paddingRight = 20;
        chart.paddingBottom = 5;
        chart.paddingLeft = 5;
    }

    configureAxis(axis: Axis, title: string): void {

        axis.tooltip.disabled = false;

        axis.tooltip.background.strokeWidth = 0.25;
        axis.tooltip.background.stroke = color(ControlsConstants.COLOR____FONT);
        axis.tooltip.background.cornerRadius = 0;
        // axis.tooltip.background.opacity = 0.90;
        axis.tooltip.background.fill = color(ControlsConstants.COLOR______BG);

        axis.tooltip.label.fontFamily = ControlsConstants.FONT_FAMILY;
        axis.tooltip.label.fontSize = ControlsConstants.FONT_SIZE - 2;
        axis.tooltip.label.fill = color(ControlsConstants.COLOR____FONT);
        axis.tooltip.label.paddingLeft = 4;
        axis.tooltip.label.paddingTop = 1;
        axis.tooltip.label.paddingBottom = 1;
        axis.tooltip.label.paddingRight = 2;

        axis.renderer.minWidth = 58;
        axis.renderer.minHeight = 58;
        axis.renderer.grid.template.disabled = false;
        axis.renderer.grid.template.stroke  = color(ControlsConstants.COLOR____FONT).brighten(-0.60);
        axis.renderer.events.on('sizechanged', e => {
            // console.log('axis width changed', e, title);
        })

        axis.renderer.minGridDistance = 12;

        axis.fontFamily = ControlsConstants.FONT_FAMILY;
        axis.fontSize = ControlsConstants.FONT_SIZE - 2;
        axis.title.text = title;
        axis.title.fontFamily = ControlsConstants.FONT_FAMILY;
        axis.title.fontSize = ControlsConstants.FONT_SIZE - 2;
        axis.title.fill = color(ControlsConstants.COLOR____FONT);

        axis.renderer.labels.template.fill = color(ControlsConstants.COLOR____FONT).brighten(-0.30);
        axis.renderer.labels.template.paddingTop = 0;
        axis.renderer.labels.template.paddingRight = 6;
        axis.renderer.labels.template.paddingBottom = 0;
        axis.renderer.labels.template.paddingLeft = 0;

    }



}