import { ControlsConstants } from './../gui/ControlsConstants';
import { ChartUtil } from './ChartUtil';
import { SankeyDiagram } from "@amcharts/amcharts4/charts";
import { color, create, Label, useTheme } from "@amcharts/amcharts4/core";
import am4themes_animated from '@amcharts/amcharts4/themes/animated';
import am4themes_dark from '@amcharts/amcharts4/themes/dark';
import { Demographics } from './../../common/demographics/Demographics';
import { IDataItem } from './../../model/state/ModelStateIntegrator';
import { ObjectUtil } from './../../util/ObjectUtil';
import { QueryUtil } from './QueryUtil';

export interface IChartData {
    contact: string,
    participant: string,
    value: number
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

    private readonly chartTitle: Label;

    private constructor() {

        useTheme(am4themes_dark);
        useTheme(am4themes_animated);

        this.instant = new Date('2021-05-01').getTime();

        this.chart = create('chartDivAgeGroupFlow', SankeyDiagram);
        this.chart.dataFields.fromName = "contact";
        this.chart.dataFields.toName = "participant";
        this.chart.dataFields.value = "value";
        this.chart.paddingTop = 6;
        this.chart.paddingRight = 6;
        this.chart.paddingBottom = 6;
        this.chart.paddingLeft = 6;

        this.chartTitle = this.chart.titles.create();
        this.chartTitle.marginBottom = 6;
        this.chartTitle.fontFamily = ControlsConstants.FONT_FAMILY;
        this.chartTitle.fontSize = ControlsConstants.FONT_SIZE + 2;
        this.chartTitle.textAlign = 'middle';
        this.chartTitle.exportable = true;

        this.chart.nodes.template.nameLabel.label.fontFamily = ControlsConstants.FONT_FAMILY;
        this.chart.nodes.template.nameLabel.label.fontSize = ControlsConstants.FONT_SIZE - 2;
        // this.chart.nodes.template.nameLabel.locationX = 0;
        // this.chart.nodes.template.nameLabel.locationY = 0;
        // this.chart.nodes.template.nameLabel.label.textAlign = 'middle';
        // this.chart.nodes.template.nameLabel.label.align = 'center';

        // this.chart.nodes.template.nameLabel.label.rotation = -90;
        // this.chart.nodes.template.nameLabel.align = 'center';
        // this.chart.nodes.template.nameLabel.align = 'center';

        // this.chart.paddingBottom = 40;

        this.chart.interpolationDuration = 0;

        this.chart.exporting.timeoutDelay = 10000;
        this.chart.exporting.adapter.add('filePrefix', (value, target) => {
            console.log('filePrefix')
            return {
                filePrefix: ObjectUtil.createDownloadName()
            };
        });

        this.chart.links.template.events.on("over", e => {


            // console.log(e.pointer.point.x, this.chart.pixelWidth);

            if (e.pointer.point.x > this.chart.pixelWidth / 2) {
                const toName = e.target.dataItem.toName;
                this.chart.links.each((link) => {
                    if (link.dataItem.toName === toName) {
                        link.fillOpacity = 0.6;
                    }
                });
            } else {
                const fromName = e.target.dataItem.fromName;
                this.chart.links.each((link) => {
                    if (link.dataItem.fromName === fromName) {
                        link.fillOpacity = 0.4;
                    }
                });
            }


        });

        this.chart.links.template.tooltipText = "";
        this.chart.links.template.events.on("out", e => {
            this.chart.links.each((link) => {
                link.fillOpacity = 0.2;
            });
        });

        this.chart.events.on('hit', e => {
            this.exportToPng();
            // this.chart.exporting.getImage('png').then(imageData => {

            //     const modificationValueBlob = new Blob([imageData], { type: "text/plain;charset=utf-8" });

            //     const url = window.URL || window.webkitURL;
            //     const link = url.createObjectURL(modificationValueBlob);
            //     var a = document.createElement("a");
            //     a.download = `${ObjectUtil.createDownloadName()}.png`;
            //     a.href = link;
            //     document.body.appendChild(a);
            //     a.click();
            //     document.body.removeChild(a);

            // });
        });

        // this.setChartMode('INCIDENCE');

    }

    setInstant(instant: number) {
        this.chartTitle.text = new Date(instant).toLocaleDateString();
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

        const chartData: IChartData[] = [];


        for (const dataItem of this.modelData) {

            if (dataItem.instant > this.instant) {

                // const ageGroupContact = Demographics.getInstance().getAgeGroups()[2];
                Demographics.getInstance().getAgeGroups().forEach(ageGroupContact => {
                    Demographics.getInstance().getAgeGroups().forEach(ageGroupParticipant => {

                        chartData.push({
                            contact: `${ageGroupContact.getName()}`,
                            participant: `p${ageGroupParticipant.getName()}`,
                            value: dataItem.exposure[ageGroupContact.getIndex()][ageGroupParticipant.getIndex()]
                        });


                    });
                });


                break;

            }

        }

        console.log(chartData);

        if (this.chart.data.length === chartData.length && !QueryUtil.getInstance().isDiffDisplay()) {
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

