import { ModelConstants, MODIFICATION____KEY } from '../../model/ModelConstants';
import { IRegressionResult } from '../../model/regression/IRegressionResult';
import { ObjectUtil } from '../../util/ObjectUtil';
import { ChartAgeGroup } from '../chart/ChartAgeGroup';
import { ControlsRegression } from '../controls/ControlsRegression';
import { StorageUtil } from '../storage/StorageUtil';
import { Demographics } from './../../common/demographics/Demographics';
import { CHART_MODE______KEY, ControlsConstants } from './ControlsConstants';
import { IconAction } from './IconAction';
import { IconChartMode } from './IconChartMode';
import { IconModelMode } from './IconModelMode';
import { SliderModification } from './SliderModification';

export interface IRegressionPointer {
    value: string,
    type: 'MULTIPLIER' | 'CORRECTION';
}

export interface IIconActionParams {
    container: string;
    actionFunction: () => void;
}

export interface IChartModeParams {
    container: string;
    label: string;
    iconKey: any;
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

    private regressionPointer: IRegressionPointer;

    private readonly modelModeIcons: IconModelMode[];
    private readonly chartModeIcons: IconChartMode[];
    private readonly ageGroupIcons: IconChartMode[];
    private readonly categoryIcons: IconChartMode[];

    private readonly actionIcons: IconAction[];

    constructor() {

        this.modelModeIcons = [];
        this.chartModeIcons = [];
        this.ageGroupIcons = [];
        this.categoryIcons = [];
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
            iconKey: 'INCIDENCE',
            handleClick: () => ModelActions.getInstance().toggleChartMode('INCIDENCE')
        }));
        this.chartModeIcons.push(new IconChartMode({
            container: 'charttoggleDiv',
            label: 'VACCINATED',
            iconKey: 'VACCINATION',
            handleClick: () => ModelActions.getInstance().toggleChartMode('VACCINATED')
        }));
        this.chartModeIcons.push(new IconChartMode({
            container: 'charttoggleDiv',
            label: 'TESTING',
            iconKey: 'TESTING',
            handleClick: () => ModelActions.getInstance().toggleChartMode('TESTING')
        }));
        this.chartModeIcons.push(new IconChartMode({
            container: 'charttoggleDiv',
            label: 'CONTACT',
            iconKey: 'CONTACT',
            handleClick: () => ModelActions.getInstance().toggleChartMode('CONTACT')
        }));
        this.chartModeIcons.push(new IconChartMode({
            container: 'charttoggleDiv',
            label: 'REPRODUCTION',
            iconKey: 'REPRODUCTION',
            handleClick: () => ModelActions.getInstance().toggleChartMode('REPRODUCTION')
        }));

        const ageGroups = [...Demographics.getInstance().getAgeGroups()].reverse();
        this.ageGroupIcons.push(new IconChartMode({
            container: 'agetoggleDiv',
            label: ModelConstants.AGEGROUP_NAME_______ALL,
            iconKey: ageGroups.length,
            handleClick: () => this.toggleAgeGroup(ageGroups.length)
        }));
        ageGroups.forEach(ageGroup => {
            this.ageGroupIcons.push(new IconChartMode({
                container: 'agetoggleDiv',
                label: ageGroup.getName(),
                iconKey: ageGroup.getIndex(),
                handleClick: () => this.toggleAgeGroup(ageGroup.getIndex())
            }));
        });

        Demographics.getInstance().getCategories().forEach(category => {
            this.categoryIcons.push(new IconChartMode({
                container: 'categorytoggleDiv',
                label: category.getName().toUpperCase(),
                iconKey: category.getName(),
                handleClick: () => this.toggleCategory(category.getName())
            }));
        })

    }

    getRegressionPointer(): IRegressionPointer {
        return this.regressionPointer;
    }

    toggleCategory(category: string): void {
        this.regressionPointer = {
            value: category,
            type: 'MULTIPLIER'
        }
        this.categoryIcons.forEach(categoryIcon => {
            categoryIcon.setActive(categoryIcon.getIconKey() === category);
        });
        ControlsRegression.getInstance().handleRegressionPointerChange();
        ChartAgeGroup.getInstance().setContactCategory(category);
    }

    toggleAgeGroup(ageGroupIndex: number): void {
        const ageGroup = Demographics.getInstance().getAgeGroupsWithTotal()[ageGroupIndex];
        this.regressionPointer = {
            value: ageGroup.getName(),
            type: 'CORRECTION'
        }
        this.ageGroupIcons.forEach(ageGroupIcon => {
            ageGroupIcon.setActive(ageGroupIcon.getIconKey() === ageGroupIndex);
        });
        ControlsRegression.getInstance().handleRegressionPointerChange();
        ChartAgeGroup.getInstance().setAgeGroupIndex(ageGroupIndex);
    }

    toggleChartMode(chartMode: CHART_MODE______KEY): void {
        this.chartModeIcons.forEach(chartModeIcon => {
            chartModeIcon.setActive(chartModeIcon.getIconKey() === chartMode);
        });
        ChartAgeGroup.getInstance().setChartMode(chartMode);
    }

    /**
     * the current model mode
     * @returns
     */
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
