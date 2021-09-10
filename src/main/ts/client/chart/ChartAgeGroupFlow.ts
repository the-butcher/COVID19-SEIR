import { ControlsConstants } from './../gui/ControlsConstants';
import { ChartUtil } from './ChartUtil';
import { SankeyDiagram } from "@amcharts/amcharts4/charts";
import { color, create, Label, Tooltip, useTheme } from "@amcharts/amcharts4/core";
import am4themes_animated from '@amcharts/amcharts4/themes/animated';
import am4themes_dark from '@amcharts/amcharts4/themes/dark';
import { Demographics } from './../../common/demographics/Demographics';
import { IDataItem } from './../../model/state/ModelStateIntegrator';
import { ObjectUtil } from './../../util/ObjectUtil';
import { QueryUtil } from './QueryUtil';

export interface IChartData {
    contact: string;
    participant: string;
    contactLabel: string;
    participantLabel: string;
    value: number;
    color: string;
}

/**
 * central chart of the application
 *
 * @author h.fleischer
 * @since 30.08.2021
 */
export class ChartAgeGroupFlow {

    // static readonly showDiffDisplay = false;

    static getInstance(): ChartAgeGroupFlow {
        if (ObjectUtil.isEmpty(this.instance)) {
            this.instance = new ChartAgeGroupFlow();
        }
        return this.instance;
    }
    private static instance: ChartAgeGroupFlow;

    protected readonly chart: SankeyDiagram;
    private modelData: IDataItem[];
    private instant: number;
    private readonly absTotal: number;

    // private readonly chartTitle: Label;

    private constructor() {

        useTheme(am4themes_dark);
        useTheme(am4themes_animated);

        this.instant = new Date('2021-05-01').getTime();
        this.absTotal = Demographics.getInstance().getAbsTotal();

        this.chart = create('chartDivAgeGroupFlow', SankeyDiagram);
        this.chart.dataFields.fromName = "contact";
        this.chart.dataFields.toName = "participant";
        this.chart.dataFields.value = "value";
        this.chart.dataFields.color = "color";
        this.chart.paddingTop = 6;
        this.chart.paddingRight = 6;
        this.chart.paddingBottom = 6;
        this.chart.paddingLeft = 6;

        this.chart.nodes.template.nameLabel.label.fontFamily = ControlsConstants.FONT_FAMILY;
        this.chart.nodes.template.nameLabel.label.fontSize = ControlsConstants.FONT_SIZE - 3;
        this.chart.nodes.template.nameLabel.label.fill = color(ControlsConstants.COLOR____FONT);

        this.chart.interpolationDuration = 0;

        this.chart.exporting.timeoutDelay = 10000;
        this.chart.exporting.adapter.add('filePrefix', (value, target) => {
            // console.log('filePrefix')
            return {
                filePrefix: ObjectUtil.createDownloadName()
            };
        });

        this.chart.links.template.colorMode = "gradient";
        this.chart.links.template.events.on("over", e => {

            const relativeX = e.pointer.point.x - document.getElementById('chartDivAgeGroupFlow').getBoundingClientRect().left;

            // console.log(relativeX, this.chart.pixelWidth);

            if (relativeX > this.chart.pixelWidth / 2) {
                const toName = e.target.dataItem.toName;
                this.chart.links.each((link) => {
                    if (link.dataItem.toName === toName) {
                        link.fillOpacity = 0.5;
                    }
                });
            } else {
                const fromName = e.target.dataItem.fromName;
                this.chart.links.each((link) => {
                    if (link.dataItem.fromName === fromName) {
                        link.fillOpacity = 0.5;
                    }
                });
            }

        });

        this.chart.links.template.tooltip = new Tooltip();
        this.chart.links.template.tooltip.background.strokeWidth = 0.25;
        this.chart.links.template.tooltip.background.stroke = color(ControlsConstants.COLOR____FONT);
        this.chart.links.template.tooltip.background.cornerRadius = 0;
        this.chart.links.template.tooltip.background.tooltipColorSource
        this.chart.links.template.tooltip.background.fill = color(ControlsConstants.COLOR______BG);
        this.chart.links.template.tooltip.getFillFromObject = false;
        this.chart.links.template.adapter.add('tooltipText', (value, target) => {
            const dataItem = target.dataItem.dataContext as IChartData;
            return `${dataItem.contactLabel} > ${dataItem.participantLabel}: ${ControlsConstants.LABEL_ABSOLUTE_FIXED.format(dataItem.value * this.absTotal)}`
        });

        this.chart.links.template.tooltip.label.fontFamily = ControlsConstants.FONT_FAMILY;
        this.chart.links.template.tooltip.label.fontSize = ControlsConstants.FONT_SIZE - 2;
        this.chart.links.template.tooltip.label.fill = color(ControlsConstants.COLOR____FONT);
        this.chart.links.template.tooltip.label.paddingLeft = 4;
        this.chart.links.template.tooltip.label.paddingTop = 1;
        this.chart.links.template.tooltip.label.paddingBottom = 1;
        this.chart.links.template.tooltip.label.paddingRight = 2;

        this.chart.links.template.events.on("out", e => {
            this.chart.links.each((link) => {
                link.fillOpacity = 0.2;
            });
        });

        this.chart.events.on('hit', e => {
            this.exportToPng();
        });

    }

    setInstant(instant: number) {
        // this.chartTitle.text = new Date(instant).toLocaleDateString();
        this.instant = instant;
        this.requestRenderModelData();
    }

    exportToPng(): void {
        this.chart.exporting.export("png");
    }

    async acceptModelData(modelData: IDataItem[]): Promise<void> {
        this.modelData = modelData;
        this.requestRenderModelData();
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

        let chartData: IChartData[] = [];


        for (const dataItem of this.modelData) {

            if (dataItem.instant > this.instant) {

                // const ageGroupContact = Demographics.getInstance().getAgeGroups()[2];
                Demographics.getInstance().getAgeGroups().forEach(ageGroupContact => {
                    Demographics.getInstance().getAgeGroups().forEach(ageGroupParticipant => {

                        const value = dataItem.exposure[ageGroupContact.getIndex()][ageGroupParticipant.getIndex()];
                        chartData.push({
                            contact: `${ageGroupContact.getName()}`,
                            participant: `p${ageGroupParticipant.getName()}`,
                            contactLabel: `${ageGroupContact.getName()}`,
                            participantLabel: `${ageGroupParticipant.getName()}`,
                            value,
                            color: ControlsConstants.COLOR____FONT
                        });


                    });
                });


                break;

            }

        }

        chartData.sort((a,b) => {
            return b.value - a.value;
        });
        // chartData = chartData.slice(0, 20);
        chartData = chartData.filter(d => d.value * this.absTotal > 100);
        chartData.sort((a,b) => {
            return a.participant.localeCompare(b.participant);
        });
        chartData.sort((a,b) => {
            return a.contact.localeCompare(b.contact);
        });

        // console.log(chartData);

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

