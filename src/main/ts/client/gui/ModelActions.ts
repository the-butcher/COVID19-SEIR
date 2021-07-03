import { ModelConstants, MODIFICATION____KEY } from '../../model/ModelConstants';
import { ObjectUtil } from '../../util/ObjectUtil';
import { ChartAgeGroup } from '../chart/ChartAgeGroup';
import { StorageUtil } from '../storage/StorageUtil';
import { Demographics } from './../../common/demographics/Demographics';
import { CHART_MODE______KEY } from './ControlsConstants';
import { IconAction } from './IconAction';
import { IconChartMode } from './IconChartMode';
import { IconModelMode } from './IconModelMode';
import { SliderModification } from './SliderModification';



export interface IIconActionParams {
    container: string;
    actionFunction: () => void;
}

export interface IChartModeParams {
    container: string;
    label: string;
    iconMode: string;
    handleClick: (e: MouseEvent) => void;
}

/**
 * this class controls model-mode, which defines the type of modification currently edited in the model
 *
 * @author h.fleischer
 * @since 11.04.2021
 */
export class ModelActions {

    static getInstance(): ModelActions {
        if (ObjectUtil.isEmpty(this.instance)) {
            this.instance = new ModelActions();
        }
        return this.instance;
    }
    private static instance: ModelActions;

    private key: MODIFICATION____KEY;
    private readonly modelModeIcons: IconModelMode[];
    private readonly chartModeIcons: IconChartMode[];
    private readonly ageGroupIcons: IconChartMode[];

    private readonly actionIcons: IconAction[];

    constructor() {

        this.modelModeIcons = [];
        this.chartModeIcons = [];
        this.ageGroupIcons = [];
        this.actionIcons = [];

        Object.keys(ModelConstants.MODIFICATION_PARAMS).forEach((key: MODIFICATION____KEY) => {
            this.modelModeIcons.push(new IconModelMode(key));
        });

        const containerDivLeft = document.getElementById('modelModeDiv');
        this.modelModeIcons.forEach(modelModeIcon => {
            containerDivLeft.appendChild(modelModeIcon.getSvgContainer());
            containerDivLeft.appendChild(modelModeIcon.getContainerDiv1());
        });

        this.actionIcons.push(new IconAction({
            container: 'actionDivExportPng',
            actionFunction: () => {
                ChartAgeGroup.getInstance().exportToPng();
            }
        }));
        this.actionIcons.push(new IconAction({
            container: 'actionDivExportCsv',
            actionFunction: () => {
                ChartAgeGroup.getInstance().exportToJson();
            }
        }));
        this.actionIcons.push(new IconAction({
            container: 'actionDivImportDiv',
            actionFunction: () => {
                StorageUtil.getInstance().importConfig();
            }
        }));
        this.actionIcons.push(new IconAction({
            container: 'actionDivSaveDiv',
            actionFunction: () => {
                StorageUtil.getInstance().storeModifications();
            }
        }));
        this.actionIcons.push(new IconAction({
            container: 'actionDivExportDiv',
            actionFunction: () => {
                StorageUtil.getInstance().exportModifications();
            }
        }));

        this.chartModeIcons.push(new IconChartMode({
            container: 'charttoggleDiv',
            label: 'INCIDENCE',
            iconMode: 'INCIDENCE',
            handleClick: () => ModelActions.getInstance().toggleChartMode('INCIDENCE')
        }));
        this.chartModeIcons.push(new IconChartMode({
            container: 'charttoggleDiv',
            label: 'SUSCEPTIBLE',
            iconMode: 'SEIR',
            handleClick: () => ModelActions.getInstance().toggleChartMode('SEIR')
        }));
        this.chartModeIcons.push(new IconChartMode({
            container: 'charttoggleDiv',
            label: 'EXPOSED',
            iconMode: 'EI',
            handleClick: () => ModelActions.getInstance().toggleChartMode('EI')
        }));
        this.chartModeIcons.push(new IconChartMode({
            container: 'charttoggleDiv',
            label: 'VACCINATED',
            iconMode: 'VACC',
            handleClick: () => ModelActions.getInstance().toggleChartMode('VACC')
        }));


        const ageGroups = [...Demographics.getInstance().getAgeGroups()].reverse();
        this.ageGroupIcons.push(new IconChartMode({
            container: 'agetoggleDiv',
            label: ModelConstants.AGEGROUP_NAME_______ALL,
            iconMode: ModelConstants.AGEGROUP_NAME_______ALL,
            handleClick: () => this.toggleAgeGroup(ModelConstants.AGEGROUP_NAME_______ALL, ageGroups.length)
        }));
        Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
            this.ageGroupIcons.push(new IconChartMode({
                container: 'agetoggleDiv',
                label: ageGroup.getName(),
                iconMode: ageGroup.getName(),
                handleClick: () => this.toggleAgeGroup(ageGroup.getName(), ageGroup.getIndex())
            }));
        });


    }

    toggleAgeGroup(name: string, index: number): void {
        this.ageGroupIcons.forEach(ageGroupIcon => {
            ageGroupIcon.setActive(ageGroupIcon.getIconMode() === name);
        });
        ChartAgeGroup.getInstance().setSeriesAgeGroup(index);
    }

    toggleChartMode(chartMode: CHART_MODE______KEY): void {
        this.chartModeIcons.forEach(chartModeIcon => {
            chartModeIcon.setActive(chartModeIcon.getIconMode() === chartMode);
        });
        ChartAgeGroup.getInstance().setChartMode(chartMode);
    }

    getKey(): MODIFICATION____KEY {
        return this.key;
    }

    toggleModelMode(key: MODIFICATION____KEY): void {
        this.key = key;
        this.modelModeIcons.forEach(modelModeIcon => {
            modelModeIcon.toggle(modelModeIcon.getKey() === key);
        });
        SliderModification.getInstance().showModifications(key);
    }

}
