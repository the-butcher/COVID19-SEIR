import { ObjectUtil } from './../../util/ObjectUtil';
import { JsonLoader } from '../../util/JsonLoader';

export interface IIncidenceData {
    "TOTAL": number;
    "<= 04": number;
    "05-14": number;
    "15-24": number;
    "25-34": number;
    "35-44": number;
    "45-54": number;
    "55-64": number;
    "65-74": number;
    "75-84": number;
    ">= 85": number;
}

export class IncidenceData {

    static setupInstance(heatmapConfig: {[K: string]: IIncidenceData}): void {
        if (ObjectUtil.isEmpty(this.instance)) {
            new JsonLoader().load(`data/heatmap-data-at.json?cb=${ObjectUtil.createId()}`).then(heatmapConfig => {
                this.instance = new IncidenceData(heatmapConfig);
            });
        }
    }

    static getInstance(): IncidenceData {
        return this.instance;
    }

    private static instance: IncidenceData;


    private heatmapConfig: {[K: string]: IIncidenceData};

    constructor(heatmapConfig: {[K: string]: IIncidenceData}) {
        this.heatmapConfig = heatmapConfig;
    }

    findIncidenceData(categoryX: string) {
        return this.heatmapConfig[categoryX];
    }


}