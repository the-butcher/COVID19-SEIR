import { ModificationResolverTime } from './../../common/modification/ModificationResolverTime';
import { SliderModification } from './../gui/SliderModification';
import { ModificationTime } from './../../common/modification/ModificationTime';
import { ChartUtil } from './ChartUtil';
import { SankeyDiagram } from "@amcharts/amcharts4/charts";
import { color, Container, create, IDisposer, Label, percent, Tooltip, useTheme } from "@amcharts/amcharts4/core";
import am4themes_animated from '@amcharts/amcharts4/themes/animated';
import am4themes_dark from '@amcharts/amcharts4/themes/dark';
import { TimeUtil } from '../../util/TimeUtil';
import { Demographics } from './../../common/demographics/Demographics';
import { IDataItem } from './../../model/state/ModelStateIntegrator';
import { ObjectUtil } from './../../util/ObjectUtil';
import { ControlsConstants } from './../gui/ControlsConstants';

export interface IChartData {
    contact: string;
    participant?: string;
    contactLabel?: string;
    participantLabel?: string;
    value?: number;
    sumContact?: number;
    sumParticipant?: number;
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
    private titleContainer: Container;
    private chartTitle: Label;

    private hitDisposer: IDisposer;

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
        // this.chart.paddingTop = 6;
        // this.chart.paddingRight = 6;
        // this.chart.paddingBottom = 6;
        // this.chart.paddingLeft = 6;


        this.chart.interpolationDuration = 0;

        this.chart.exporting.timeoutDelay = 10000;
        this.chart.exporting.adapter.add('filePrefix', (value, target) => {
            // console.log('filePrefix')
            return {
                filePrefix: ObjectUtil.createDownloadName()
            };
        });

        this.chart.paddingTop = 36;
        this.chart.paddingRight = 12;
        this.chart.paddingBottom = 12;
        this.chart.paddingLeft = 12;

        this.titleContainer = this.chart.chartContainer.createChild(Container);
        this.titleContainer.dy = -32;
        this.titleContainer.layout = "absolute";
        this.titleContainer.toBack();
        this.titleContainer.width = percent(100);
        this.titleContainer.paddingBottom = 10;
        this.titleContainer.exportable = true;

        this.chartTitle = this.titleContainer.createChild(Label);
        this.chartTitle.text = 'Exposure [font-size: 12px](estimate)[/]';
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

        this.chart.nodes.template.nameLabel.label.fontFamily = ControlsConstants.FONT_FAMILY;
        this.chart.nodes.template.nameLabel.label.fontSize = ControlsConstants.FONT_SIZE - 3;
        this.chart.nodes.template.nameLabel.label.fill = color(ControlsConstants.COLOR____FONT);

        this.chart.nodes.template.nameLabel.label.adapter.add('dx', (value, target) => {
            return target.parent.parent.pixelX > 0 ? -52 : value;
        });


        this.chart.links.template.events.on("over", e => {

            const relativeX = e.pointer.point.x - document.getElementById('chartDivAgeGroupFlow').getBoundingClientRect().left;

            if (relativeX > this.chart.pixelWidth / 2) {
                const fromName = e.target.dataItem.fromName;
                const toName = e.target.dataItem.toName;
                this.chart.links.each((link) => {
                    if (link.dataItem.fromName === fromName && link.dataItem.toName === toName) {
                        link.fillOpacity = 0.7;
                    } else if (link.dataItem.toName === toName) {
                        link.fillOpacity = 0.5;
                    }
                });
            } else {
                const fromName = e.target.dataItem.fromName;
                const toName = e.target.dataItem.toName;
                this.chart.links.each((link) => {
                    if (link.dataItem.fromName === fromName && link.dataItem.toName === toName) {
                        link.fillOpacity = 0.7;
                    } else if (link.dataItem.fromName === fromName) {
                        link.fillOpacity = 0.5;
                    }
                });
            }

        });

        this.chart.links.template.tooltip = new Tooltip();
        this.chart.links.template.tooltip.background.strokeWidth = 0.25;
        this.chart.links.template.tooltip.background.stroke = color(ControlsConstants.COLOR____FONT);
        this.chart.links.template.tooltip.background.cornerRadius = 0;
        // this.chart.links.template.tooltip.background.tooltipColorSource
        this.chart.links.template.tooltip.background.fill = color(ControlsConstants.COLOR______BG);
        this.chart.links.template.tooltip.getFillFromObject = false;

        // this.chart.links.template.colorMode = "solid";
        // this.chart.links.template.propertyFields.fill = "color";

        this.chart.links.template.adapter.add('tooltipText', (value, target) => {
            const dataItem = target.dataItem.dataContext as IChartData;
            let formatContact: string = '-';
            let formatParticipant: string = '-';
            if (dataItem.sumContact > dataItem.sumParticipant) {
                formatContact = '>';
            } else if (dataItem.sumParticipant > dataItem.sumContact) {
                formatParticipant = '<';
            }
            return `${dataItem.contactLabel} > ${dataItem.participantLabel}: ${ControlsConstants.LABEL_ABSOLUTE_FIXED.format(dataItem.value * this.absTotal).padStart(5, '\u00A0')}\n${dataItem.contactLabel} ${formatContact} OTHER: ${ControlsConstants.LABEL_ABSOLUTE_FIXED.format(dataItem.sumContact * this.absTotal).padStart(5, '\u00A0')}\n${dataItem.contactLabel} ${formatParticipant} OTHER: ${ControlsConstants.LABEL_ABSOLUTE_FIXED.format(dataItem.sumParticipant * this.absTotal).padStart(5, '\u00A0')}`
        });

        this.chart.links.template.adapter.add('fill', (value, target) => {
            // console.log(target.dataItem.fromName, target.dataItem);
            return value;
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
                link.fill = color('#6da0bf');
            });
        });

        this.hitDisposer = this.chart.events.on('hit', e => {
            this.handleHit();
        });

    }

    async handleHit(): Promise<void> {
        await this.exportToPng();
        this.setInstant(this.instant + TimeUtil.MILLISECONDS_PER____DAY);
    }

    setInstant(instant: number) {
        this.instant = instant;
        this.requestRenderModelData();

    }

    async exportToPng(): Promise<boolean> {
        return this.chart.exporting.export("png");
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
        const groupNames: Set<string> = new Set();

        for (const dataItem of this.modelData) {

            if (dataItem.instant > this.instant) {

                this.chartTitle.text = `Exposure [font-size: 12px](estimate for ${TimeUtil.formatCategoryDateFull(this.instant)})[/]`;

                let values: number[] = [];
                let totalValue = 0;


                let totalByContact: number[] = [];
                let totalByParticipant: number[] = [];

                Demographics.getInstance().getAgeGroups().forEach(ageGroupContact => {
                    totalByContact[ageGroupContact.getIndex()] = 0;
                    totalByParticipant[ageGroupContact.getIndex()] = 0;
                });
                Demographics.getInstance().getAgeGroups().forEach(ageGroupContact => {
                    Demographics.getInstance().getAgeGroups().forEach(ageGroupParticipant => {
                        const value = dataItem.exposure[ageGroupContact.getIndex()][ageGroupParticipant.getIndex()];
                        values.push(value);
                        totalValue += value;
                        totalByContact[ageGroupContact.getIndex()] = totalByContact[ageGroupContact.getIndex()] + value;
                        totalByParticipant[ageGroupParticipant.getIndex()] = totalByParticipant[ageGroupParticipant.getIndex()] + value;
                    });
                });
                // let totalContact = totalByContact.reduce((a, b) => a + b, 0);
                // let totalParticitpant = totalByParticipant.reduce((a, b) => a + b, 0);
                // console.log('c-p', totalContact, totalParticitpant);

                values = values.sort((a,b) => b - a);
                const minValue = values[Math.min(200, values.length - 1)]; // show the 20 largest connections
                // console.log('totalValue', totalValue);
                // document.getElementById('chartDivAgeGroupFlow').style.height = Math.floor(totalValue * 300000) + 'px';

                const colorDriving = '#3e5c6e';
                const colorDriven = '#1b2830';

                Demographics.getInstance().getAgeGroups().forEach(ageGroupContact => {

                    const barColor = totalByContact[ageGroupContact.getIndex()] < totalByParticipant[ageGroupContact.getIndex()] ? colorDriving : colorDriven;
                    chartData.push({
                        contact: ` ${ageGroupContact.getName()}`,
                        color: barColor
                    });

                });

                Demographics.getInstance().getAgeGroups().forEach(ageGroupContact => {

                    Demographics.getInstance().getAgeGroups().forEach(ageGroupParticipant => {

                        const value = dataItem.exposure[ageGroupContact.getIndex()][ageGroupParticipant.getIndex()];
                        if (value >= minValue) {
                            // console.log('adding', value, minValue);
                            const barColor = totalByContact[ageGroupContact.getIndex()] > totalByParticipant[ageGroupContact.getIndex()] ? colorDriving : colorDriven;
                            chartData.push({
                                contact: `${ageGroupContact.getName()}`,
                                participant: ` ${ageGroupParticipant.getName()}`, // note the blank
                                contactLabel: `${ageGroupContact.getName()}`,
                                participantLabel: `${ageGroupParticipant.getName()}`,
                                value,
                                sumContact: totalByContact[ageGroupContact.getIndex()],
                                sumParticipant: totalByParticipant[ageGroupContact.getIndex()],
                                color: barColor
                            });
                            groupNames.add(ageGroupContact.getName());
                            groupNames.add(ageGroupParticipant.getName());
                        } else {
                            chartData.push({
                                contact: `${ageGroupContact.getName()}`,
                                participant: `p${ageGroupParticipant.getName()}`,
                                contactLabel: `${ageGroupContact.getName()}`,
                                participantLabel: `${ageGroupParticipant.getName()}`,
                                value: 0,
                                sumContact: 0,
                                sumParticipant: 0,
                                color: '#3e5c6e'
                            });
                        }

                    });
                });

                break;

            }

        }

        // console.log('chartData (flow)', chartData);

        // chartData = chartData.filter(c => {
        //     return groupNames.has(c.contactLabel) && groupNames.has(c.participantLabel);
        // });

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

