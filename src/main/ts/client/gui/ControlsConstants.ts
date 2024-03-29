import { ChartAgeGroup } from './../chart/ChartAgeGroup';
import { Demographics } from '../../common/demographics/Demographics';
import { IModification } from '../../common/modification/IModification';
import { IModificationValues } from '../../common/modification/IModificationValues';
import { ModificationContact } from '../../common/modification/ModificationContact';
import { ModificationDiscovery } from '../../common/modification/ModificationDiscovery';
import { ModificationResolverContact } from '../../common/modification/ModificationResolverContact';
import { ModificationResolverDiscovery } from '../../common/modification/ModificationResolverDiscovery';
import { ModificationResolverSettings } from '../../common/modification/ModificationResolverSettings';
import { ModificationResolverVaccination } from '../../common/modification/ModificationResolverVaccination';
import { ModificationSeasonality } from '../../common/modification/ModificationSeasonality';
import { ModificationSettings } from '../../common/modification/ModificationSettings';
import { ModificationStrain } from '../../common/modification/ModificationStrain';
import { ModificationTime } from '../../common/modification/ModificationTime';
import { ModificationVaccination } from '../../common/modification/ModificationVaccination';
import { BaseData } from '../../model/basedata/BaseData';
import { ModelConstants, MODIFICATION____KEY } from '../../model/ModelConstants';
import { Color } from '../../util/Color';
import { QueryUtil } from '../../util/QueryUtil';
import { ControlsContact } from '../controls/ControlsContact';
import { ControlsDiscovery } from '../controls/ControlsDiscovery';
import { ControlsSeasonality } from '../controls/ControlsSeasonality';
import { ControlsSettings } from '../controls/ControlsSettings';
import { ControlsStrain } from '../controls/ControlsStrain';
import { ControlsTime } from '../controls/ControlsTime';
import { ControlsVaccination } from '../controls/ControlsVaccination';
import { ModelTask } from '../ModelTask';
import { IModificationResolver } from './../../common/modification/IModificationResolver';
import { ModificationResolverSeasonality } from './../../common/modification/ModificationResolverSeasonality';
import { ModificationResolverStrain } from './../../common/modification/ModificationResolverStrain';
import { ModificationResolverTime } from './../../common/modification/ModificationResolverTime';
import { Modifications } from './../../common/modification/Modifications';
import { IWorkerInput } from './../../model/IWorkerInput';
import { ModelInstants } from './../../model/ModelInstants';
import { IDataItem } from './../../model/state/ModelStateIntegrator';
import { ObjectUtil } from './../../util/ObjectUtil';
import { ModificationResolverRegression } from '../../common/modification/ModificationResolverRegression';
import { ModificationRegression } from '../../common/modification/ModificationRegression';
import { ControlsRegression } from '../controls/ControlsRegression';

export interface IControlsDefinitions {
    icon: string;
    container: string;
    handleModificationUpdate: () => Promise<void>;
    handleModificationDrag: (instant: number) => void;
    showInEditor?: (modification: IModification<IModificationValues>) => void;
    getModificationResolver(): IModificationResolver<IModificationValues, IModification<IModificationValues>>;
    labellingDefinition: ILabellingDefinition;
}

export interface IHeatmapColorDefinition {
    id: string;
    title: string;
    getHeatColor: (value: number) => string;
}
export interface IHeatmapChartDefinition extends IHeatmapColorDefinition {
    getHeatValue: (dataItem: IDataItem, ageGroupName: string) => number;
    getHeatLabel: (value: number) => string;
    getHeatMax: (maxValue: number) => number;
    visitChart: (chart: ChartAgeGroup) => void;
}

export interface ILabellingDefinition {
    format(value: number): string;
}

export type CHART_MODE______KEY = 'INCIDENCE' | 'VACCINATED' | 'TESTING' | 'CONTACT' | 'REPRODUCTION'; // | 'HOSPITAL';
export type COMPARTMENT__COLORS = 'SUSCEPTIBLE' | 'IMMUNIZING' | 'EXPOSED' | 'INFECTIOUS' | 'REMOVED' | 'MOBILITY' | 'INCIDENCE' | 'CASES' | MODIFICATION____KEY;

export const HUE_VACCINATION = 0.540;
export const HUE_____EXPOSED = 0.060;
export const HUE__INFECTIOUS = HUE_____EXPOSED + 0.07;
export const HUE___RECOVERED = HUE_____EXPOSED + 0.14;

/**
 * collection of type specific functionality, think methods on enum-constants
 * there is another, model specific, class like this: ModelConstants
 *
 * @author h.fleischer
 * @since 30.05.2021
 */
export class ControlsConstants {

    static readonly LOCALE_FORMAT_FLOAT_1 = {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    };
    static readonly LOCALE_FORMAT_FLOAT_2 = {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    };
    static readonly LOCALE_FORMAT_FLOAT_3 = {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3
    };
    static readonly LOCALE_FORMAT_FIXED = {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    };

    static readonly LABEL_PERCENT__FLOAT_3: ILabellingDefinition = {
        format: value => `${(value * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_3)}%`
    }

    static readonly LABEL_PERCENT__FLOAT_2: ILabellingDefinition = {
        format: value => `${(value * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_2)}%`
    }

    static readonly LABEL_PERCENT__FLOAT_2_ABS: ILabellingDefinition = {
        format: value => `${(value * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_2)}% - ${(value * ChartAgeGroup.getInstance().getAbsValue()).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FIXED)}`
    }


    /**
     * primarily for percentage axes
     */
    static readonly LABEL_PERCENT___FIXED: ILabellingDefinition = {
        format: value => `${(value * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FIXED)}%`
    }

    static readonly LABEL_ABSOLUTE_FLOAT_2: ILabellingDefinition = {
        format: value => value.toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_2)
    }

    static readonly LABEL_ABSOLUTE_FIXED: ILabellingDefinition = {
        format: value => value.toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FIXED)
    }



    static readonly COLORS: { [K in COMPARTMENT__COLORS]: string } = {

        'SUSCEPTIBLE': '#1a1a1a',
        'IMMUNIZING': new Color(HUE_VACCINATION, 1.00, 0.35).getHex(), // '#186987',
        'EXPOSED': new Color(HUE_____EXPOSED, 1.00, 0.78).getHex(), // '#7c400e',
        'INFECTIOUS': new Color(HUE__INFECTIOUS, 1.00, 0.83).getHex(), // '#bd6215',
        'REMOVED': new Color(HUE___RECOVERED, 1.00, 0.93).getHex(), // '#caba0d',

        'MOBILITY': '#0c90bb',

        'INCIDENCE': '#bbbbbb', // '#df5f5f',
        'CASES': '#666666', // '#acb00b',
        'TIME': '#aaaaaa', // '#aaaaaa',
        'STRAIN': new Color(HUE__INFECTIOUS, 1.00, 0.83).getHex(), // '#b012bb',
        'CONTACT': '#b5594b',
        'TESTING': '#29c437',
        'VACCINATION': new Color(HUE_VACCINATION, 1.00, 0.93).getHex(), // '#1b94bb',
        'SEASONALITY': '#dbd905',
        'SETTINGS': '#687580',
        'REGRESSION': '#976b00'
    };

    static readonly HEATMAP_______PLAIN: IHeatmapColorDefinition = {
        id: ObjectUtil.createId(),
        title: 'plain',
        getHeatColor: (value) => new Color(0.0, 0.0, Math.min(1.0, (10 + Math.round(value * 90)) / 100)).getHex()
    }

    static readonly HEATMAP_DATA_PARAMS: { [K in CHART_MODE______KEY]: IHeatmapChartDefinition } = {
        'INCIDENCE': {
            id: ObjectUtil.createId(),
            title: 'Incidence',
            getHeatValue: (dataItem, ageGroupName) => dataItem.valueset[ageGroupName].INCIDENCES[ModelConstants.STRAIN_ID___________ALL],
            getHeatLabel: (value) => QueryUtil.getInstance().isDiffDisplay() ? `${value.toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_2)}` : `${value.toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FIXED)}`,
            getHeatColor: (value) => new Color(0.00, 0.00, Math.min(1.0, (10 + Math.round(value * 90)) / 100)).getHex(),
            getHeatMax: (maxValue) => maxValue,
            visitChart: (chart) => {
                chart.setSeriesSRVisible(false);
                chart.setSeriesTestingVisible(false);
                chart.setSeriesContactVisible(false);
                chart.setSeriesReproductionVisible(false);
                // chart.setSeriesHospitalVisible(false);
                chart.setSeriesIncidenceVisible(true);
                chart.setSeriesEIVisible(false, true);
            }
        },
        'VACCINATED': {
            id: ObjectUtil.createId(),
            title: 'Compartments',
            getHeatValue: (dataItem, ageGroupName) => dataItem.valueset[ageGroupName].INFECTIOUS[ModelConstants.STRAIN_ID___________ALL],
            getHeatLabel: (value) => `${(value * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_2)}%`,
            getHeatColor: (value) => new Color(HUE__INFECTIOUS, Math.max(0, value * 0.85), Math.min(1.0, (10 + Math.round(value * 60)) / 100)).getHex(),
            getHeatMax: (maxValue) => maxValue,
            visitChart: (chart) => {
                chart.setSeriesIncidenceVisible(false);
                chart.setSeriesTestingVisible(false);
                chart.setSeriesContactVisible(false);
                chart.setSeriesReproductionVisible(false);
                // chart.setSeriesHospitalVisible(false);
                chart.setSeriesEIVisible(true, true);
                chart.setSeriesSRVisible(true);
            }
        },
        'TESTING': {
            id: ObjectUtil.createId(),
            title: 'Testing estimates',
            getHeatValue: (dataItem, ageGroupName) => Math.min(1, dataItem.valueset[ageGroupName].DISCOVERY),
            getHeatLabel: (value) => `${(value * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_2)}%`,
            getHeatColor: (value) => new Color(0.35, Math.max(0, value * 0.85), Math.min(1.0, (10 + Math.round(value * 60)) / 100)).getHex(),
            getHeatMax: (maxValue) => maxValue,
            visitChart: (chart) => {
                chart.setSeriesIncidenceVisible(false);
                chart.setSeriesEIVisible(false, false);
                chart.setSeriesSRVisible(false);
                chart.setSeriesContactVisible(false);
                chart.setSeriesReproductionVisible(false);
                // chart.setSeriesHospitalVisible(false);
                chart.setSeriesTestingVisible(true);
            }
        },
        'CONTACT': {
            id: ObjectUtil.createId(),
            title: 'Contact / Regression',
            getHeatValue: (dataItem, ageGroupName) => dataItem.valueset[ageGroupName].INCIDENCES[ModelConstants.STRAIN_ID___________ALL], // SAME AS INCIDENCE FOR NOW
            getHeatLabel: (value) => `${(value * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_2)}%`,
            getHeatColor: (value) => new Color(0.12, Math.min(0.75, value), Math.min(1.0, (10 + Math.round(value * 90)) / 100)).getHex(),
            getHeatMax: (maxValue) => maxValue,
            visitChart: (chart) => {
                chart.setSeriesIncidenceVisible(false);
                chart.setSeriesEIVisible(false, false);
                chart.setSeriesSRVisible(false);
                chart.setSeriesTestingVisible(false);
                chart.setSeriesReproductionVisible(false);
                // chart.setSeriesHospitalVisible(false);
                chart.setSeriesContactVisible(true);
            }
        },
        'REPRODUCTION': {
            id: ObjectUtil.createId(),
            title: 'Reproduction',
            getHeatValue: (dataItem, ageGroupName) => {
                return dataItem.valueset[ageGroupName].REPRODUCTION[ModelConstants.STRAIN_ID___________ALL];
            },
            getHeatLabel: (value) => `${(value * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_2)}%`,
            getHeatColor: (value) => new Color(HUE__INFECTIOUS, Math.max(0, value * 0.85), Math.min(1.0, (10 + Math.round(value * 90)) / 100)).getHex(),
            getHeatMax: (maxValue) => 2,
            visitChart: (chart) => {
                chart.setSeriesIncidenceVisible(false);
                chart.setSeriesEIVisible(false, false);
                chart.setSeriesSRVisible(false);
                chart.setSeriesTestingVisible(false);
                chart.setSeriesContactVisible(false);
                // chart.setSeriesHospitalVisible(false);
                chart.setSeriesReproductionVisible(true);
            }
        },
        // 'HOSPITAL': {
        //     id: ObjectUtil.createId(),
        //     title: 'Hospital',
        //     getHeatValue: (dataItem, ageGroupName) => dataItem.valueset[ageGroupName].INCIDENCES[ModelConstants.STRAIN_ID___________ALL], // TODO add hospital to model data
        //     getHeatLabel: (value) => `${(value * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_2)}%`,
        //     getHeatColor: (value) => new Color(0.12, Math.min(0.75, value), Math.min(1.0, (10 + Math.round(value * 90)) / 100)).getHex(),
        //     getHeatMax: (maxValue) => maxValue,
        //     visitChart: (chart) => {
        //         chart.setSeriesIncidenceVisible(false);
        //         chart.setSeriesEIVisible(false, false);
        //         chart.setSeriesSRVisible(false);
        //         chart.setSeriesTestingVisible(false);
        //         chart.setSeriesContactVisible(false);
        //         chart.setSeriesReproductionVisible(false);
        //         chart.setSeriesHospitalVisible(true);
        //     }
        // }
    }

    static readonly MODIFICATION_PARAMS: { [K in MODIFICATION____KEY]: IControlsDefinitions } = {
        'TIME': {
            icon: 'M 4.62 3.25 H 4.62 L 3.62 4.5 A 0.8 0.8 90 0 1 2.5 4.63 H 2.5 L -0.85 2.14 A 2 2 90 0 1 -1.6 0.58 V -7.2 A 0.8 0.8 90 0 1 -0.8 -8 H 0.8 A 0.8 0.8 90 0 1 1.6 -7.2 V 0 L 4.5 2.13 A 0.8 0.8 90 0 1 4.62 3.25 Z',
            container: 'modificationTimeDiv',
            handleModificationUpdate: () => {
                return null; // do nothing
            },
            handleModificationDrag: (instant: number) => {
                ChartAgeGroup.getInstance().setInstant(instant);
            },
            getModificationResolver: () => {
                // console.log('create or get time resolver');
                const modificationResolver = ModificationResolverTime.getInstance();
                modificationResolver.buildModificationData();
                return modificationResolver;
            },
            showInEditor: modification => {
                ControlsTime.getInstance().acceptModification(modification as ModificationTime);
            },
            labellingDefinition: ControlsConstants.LABEL_ABSOLUTE_FLOAT_2 //FIXED
        },
        'STRAIN': {
            icon: 'M 7.85 -0.98 H 7.1 c -1.75 0 -2.62 -2.11 -1.39 -3.35 L 6.24 -4.86 A 0.98 0.98 90 0 0 4.86 -6.24 L 4.33 -5.72 c -1.24 1.24 -3.35 0.36 -3.35 -1.39 V -7.85 a 0.98 0.98 90 0 0 -1.96 0 V -7.1 c 0 1.75 -2.11 2.62 -3.35 1.39 L -4.86 -6.24 A 0.98 0.98 90 0 0 -6.24 -4.86 l 0.53 0.53 c 1.24 1.24 0.36 3.35 -1.39 3.35 H -7.85 a 0.98 0.98 90 1 0 0 1.96 H -7.1 c 1.75 0 2.62 2.11 1.39 3.35 L -6.24 4.86 A 0.98 0.98 90 0 0 -4.86 6.24 l 0.53 -0.53 c 1.24 -1.24 3.35 -0.36 3.35 1.39 v 0.74 a 0.98 0.98 90 0 0 1.96 0 V 7.1 c 0 -1.75 2.11 -2.62 3.35 -1.39 L 4.86 6.24 A 0.98 0.98 90 0 0 6.24 4.86 l -0.53 -0.53 c -1.24 -1.24 -0.36 -3.35 1.39 -3.35 h 0.74 a 0.98 0.98 90 1 0 0 -1.96 Z M -1.1 0.55 a 1.66 1.66 90 1 1 1.66 -1.66 A 1.66 1.66 90 0 1 -1.1 0.55 Z m 2.76 1.93 a 0.83 0.83 90 1 1 0.83 -0.83 A 0.83 0.83 90 0 1 1.66 2.48 Z',
            container: 'modificationStrainDiv',
            handleModificationUpdate: () => {
                return ModelTask.commit('STRAIN', ControlsConstants.createWorkerInput());
            },
            getModificationResolver: () => {
                return new ModificationResolverStrain();
            },
            handleModificationDrag: () => { },
            showInEditor: modification => ControlsStrain.getInstance().acceptModification(modification as ModificationStrain),
            labellingDefinition: ControlsConstants.LABEL_ABSOLUTE_FLOAT_2
        },
        'CONTACT': {
            icon: 'M -5.38 -4.08 A 1.79 1.79 90 1 0 -7.17 -5.88 A 1.79 1.79 90 0 0 -5.38 -4.08 Z M -5.38 0.85 A 1.24 1.24 90 0 1 -4.99 -0.05 L -2.97 -1.96 C -2.93 -2 -2.87 -2.02 -2.82 -2.06 A 1.79 1.79 90 0 0 -4.48 -3.19 H -6.27 A 1.79 1.79 90 0 0 -8.06 -1.4 V 1.29 A 0.9 0.9 90 0 0 -7.17 2.19 V 5.77 A 0.9 0.9 90 0 0 -6.27 6.67 H -4.48 A 0.9 0.9 90 0 0 -3.58 5.77 V 3.07 L -4.99 1.74 A 1.23 1.23 90 0 1 -5.38 0.85 Z M 5.38 -4.08 A 1.79 1.79 90 1 0 3.58 -5.88 A 1.79 1.79 90 0 0 5.38 -4.08 Z M 6.27 -3.19 H 4.48 A 1.79 1.79 90 0 0 2.82 -2.06 C 2.87 -2.02 2.93 -2 2.97 -1.96 L 4.99 -0.05 A 1.24 1.24 90 0 1 4.99 1.74 L 3.58 3.07 V 5.77 A 0.9 0.9 90 0 0 4.48 6.67 H 6.27 A 0.9 0.9 90 0 0 7.17 5.77 V 2.19 A 0.9 0.9 90 0 0 8.06 1.29 V -1.4 A 1.79 1.79 90 0 0 6.27 -3.19 Z M 4.38 0.6 L 2.36 -1.3 A 0.34 0.34 90 0 0 1.79 -1.06 V -0.05 H -1.79 V -1.06 A 0.34 0.34 90 0 0 -2.36 -1.3 L -4.38 0.6 A 0.35 0.35 90 0 0 -4.38 1.09 L -2.36 3 A 0.34 0.34 90 0 0 -1.79 2.75 V 1.74 H 1.79 V 2.75 A 0.34 0.34 90 0 0 2.36 3 L 4.38 1.09 A 0.35 0.35 90 0 0 4.38 0.6 Z',
            container: 'modificationContactDiv',
            handleModificationUpdate: () => {
                return ModelTask.commit('CONTACT', ControlsConstants.createWorkerInput());
            },
            getModificationResolver: () => {
                return new ModificationResolverContact();
            },
            handleModificationDrag: () => { },
            showInEditor: modification => ControlsContact.getInstance().acceptModification(modification as ModificationContact),
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2
        },
        'TESTING': {
            icon: 'M 7.98 -2.66 L 2.65 -7.98 C 2.55 -8.08 2.39 -8.08 2.29 -7.98 L 1.22 -6.91 C 1.12 -6.81 1.12 -6.65 1.22 -6.55 L 1.57 -6.2 L -6.11 1.47 C -7.34 2.69 -7.54 4.7 -6.41 6.01 C -5.75 6.77 -4.84 7.15 -3.92 7.15 C -3.09 7.15 -2.25 6.83 -1.61 6.2 L 6.19 -1.59 L 6.55 -1.24 C 6.64 -1.14 6.8 -1.14 6.9 -1.24 L 7.98 -2.31 C 8.08 -2.4 8.08 -2.57 7.98 -2.66 Z M 2.92 -0.45 H -2.05 L 2.64 -5.13 L 5.12 -2.65 L 2.92 -0.45 Z',
            container: 'modificationTestingDiv',
            handleModificationUpdate: () => {
                // skip update after settings change --> let the current task complete, it will pick up the changes on the next cycle
                if (QueryUtil.getInstance().getWorkerMode() !== 'REBUILDING') {
                    return ModelTask.commit('TESTING', ControlsConstants.createWorkerInput());
                }
            },
            getModificationResolver: () => {
                return new ModificationResolverDiscovery();
            },
            handleModificationDrag: () => { },
            showInEditor: modification => {
                ControlsDiscovery.getInstance().acceptModification(modification as ModificationDiscovery);
                // ChartAgeGroup.getInstance().setChartMode('TESTING');
            },
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2
        },
        'VACCINATION': {
            icon: 'm -1.68 -2.5 l 1.72 1.72 c 0.09 0.09 0.09 0.25 0 0.35 l -0.35 0.34 c -0.1 0.1 -0.25 0.1 -0.35 0 l -1.71 -1.71 l -1.4 1.39 l 1.72 1.72 c 0.09 0.09 0.09 0.25 0 0.35 l -0.35 0.34 c -0.09 0.1 -0.25 0.1 -0.35 0 l -1.72 -1.72 l -0.81 0.82 c -0.53 0.53 -0.79 1.26 -0.71 2.01 l 0.22 1.96 l -2.04 2.04 c -0.1 0.1 -0.1 0.26 0 0.35 l 0.34 0.35 c 0.1 0.1 0.26 0.1 0.35 0 l 2.04 -2.04 l 1.96 0.22 c 0.74 0.08 1.48 -0.17 2.02 -0.71 l 5.6 -5.6 l -4.18 -4.18 l -2 2 z m 9.49 -2.87 l -2.44 -2.44 c -0.09 -0.1 -0.25 -0.1 -0.34 0 l -0.35 0.34 c -0.1 0.1 -0.1 0.26 0 0.35 l 0.87 0.87 l -1.39 1.4 l -1.75 -1.74 l -0.52 -0.53 c -0.1 -0.09 -0.25 -0.09 -0.35 0 l -1.04 1.05 c -0.1 0.09 -0.1 0.25 0 0.34 l 0.52 0.53 l 4.18 4.18 l 0.52 0.53 c 0.1 0.09 0.26 0.09 0.35 0 l 1.04 -1.05 c 0.1 -0.1 0.1 -0.25 0 -0.35 l -2.26 -2.26 l 1.4 -1.4 l 0.87 0.87 c 0.09 0.1 0.25 0.1 0.35 0 l 0.34 -0.34 c 0.1 -0.1 0.1 -0.26 0 -0.35 z',
            container: 'modificationVaccinationDiv',
            handleModificationUpdate: () => {
                return ModelTask.commit('VACCINATION', ControlsConstants.createWorkerInput());
            },
            getModificationResolver: () => {
                return new ModificationResolverVaccination();
            },
            handleModificationDrag: () => { },
            showInEditor: modification => {
                ControlsVaccination.getInstance().acceptModification(modification as ModificationVaccination);
                ChartAgeGroup.getInstance().setChartMode('VACCINATED');
            },
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2
        },
        'SEASONALITY': {
            icon: 'M 3.73 5.81 c -2.35 0 -3.44 -2.8 -4.5 -5.5 C -1.59 -1.78 -2.52 -4.15 -3.73 -4.15 c -1.03 0 -2.37 2.12 -2.96 3.86 a 0.41 0.41 90 0 1 -0.51 0.27 l -0.8 -0.24 A 0.41 0.41 90 0 1 -8.27 -0.79 C -7.79 -2.23 -6.16 -5.81 -3.73 -5.81 c 2.35 0 3.44 2.8 4.5 5.5 C 1.59 1.78 2.52 4.15 3.73 4.15 c 1.03 0 2.37 -2.12 2.96 -3.86 a 0.41 0.41 90 0 1 0.51 -0.27 l 0.8 0.24 a 0.41 0.41 90 0 1 0.27 0.53 C 7.79 2.23 6.16 5.81 3.73 5.81 z',
            container: 'modificationSeasonalityDiv',
            handleModificationUpdate: () => {
                return ModelTask.commit('SEASONALITY', ControlsConstants.createWorkerInput());
            },
            handleModificationDrag: () => { },
            getModificationResolver: () => {
                return new ModificationResolverSeasonality();
            },
            showInEditor: modification => {
                ControlsSeasonality.getInstance().acceptModification(modification as ModificationSeasonality);
                // ChartAgeGroup.getInstance().setChartMode('REPRODUCTION');
            },
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2
        },
        'REGRESSION': {
            icon: 'M 6.9858 -4.3491 H 2.2521 C 1.3949 -4.3491 0.9656 -3.3126 1.5718 -2.7065 L 2.8708 -1.4074 L -0.071 1.5348 L -3.0128 -1.407 C -3.5138 -1.9082 -4.3263 -1.9082 -4.827 -1.407 L -7.5812 1.3472 C -7.8318 1.5978 -7.8318 2.0039 -7.5812 2.2546 L -6.6743 3.1616 C -6.4236 3.4119 -6.0174 3.4119 -5.7669 3.1616 L -3.9201 1.3143 L -0.9783 4.2561 C -0.4771 4.7573 0.3353 4.7573 0.836 4.2561 L 4.6851 0.407 L 5.9842 1.7061 C 6.5904 2.3123 7.6269 1.8829 7.6269 1.0257 V -3.7076 C 7.6273 -4.062 7.3402 -4.3491 6.9858 -4.3491 Z',
            container: 'modificationRegressionDiv',
            handleModificationUpdate: () => {
                return ModelTask.commit('REGRESSION', ControlsConstants.createWorkerInput());
            },
            getModificationResolver: () => {
                return new ModificationResolverRegression();
            },
            handleModificationDrag: () => { },
            showInEditor: modification => {
                // ChartAgeGroup.getInstance().setChartMode('CONTACT');
                ControlsRegression.getInstance().acceptModification(modification as ModificationRegression);
            },
            labellingDefinition: ControlsConstants.LABEL_ABSOLUTE_FIXED
        },
        'SETTINGS': {
            icon: 'm 6.8 3.62 h -9.52 v -0.45 c 0 -0.25 -0.2 -0.45 -0.45 -0.45 h -0.91 c -0.25 0 -0.45 0.2 -0.45 0.45 v 0.45 h -2.27 c -0.25 0 -0.45 0.2 -0.45 0.45 v 0.91 c 0 0.25 0.2 0.45 0.45 0.45 h 2.27 v 0.45 c 0 0.25 0.2 0.45 0.45 0.45 h 0.91 c 0.25 0 0.45 -0.2 0.45 -0.45 v -0.45 h 9.51 c 0.25 0 0.45 -0.2 0.45 -0.45 v -0.91 c 0 -0.25 -0.2 -0.45 -0.45 -0.45 z m 0 -4.53 h -2.27 v -0.45 c 0 -0.25 -0.2 -0.45 -0.45 -0.45 h -0.91 c -0.25 0 -0.45 0.2 -0.45 0.45 v 0.45 h -9.52 c -0.25 0 -0.45 0.2 -0.45 0.45 v 0.91 c 0 0.25 0.2 0.45 0.45 0.45 h 9.51 v 0.45 c 0 0.25 0.2 0.45 0.45 0.45 h 0.91 c 0.25 0 0.45 -0.2 0.45 -0.45 v -0.45 h 2.27 c 0.25 0 0.45 -0.2 0.45 -0.45 v -0.91 c 0 -0.25 -0.2 -0.45 -0.45 -0.45 z m 0 -4.53 h -5.89 v -0.45 c 0 -0.25 -0.2 -0.45 -0.45 -0.45 h -0.91 c -0.25 0 -0.45 0.2 -0.45 0.45 v 0.45 h -5.9 c -0.24 -0 -0.45 0.21 -0.45 0.46 v 0.91 c 0 0.25 0.2 0.45 0.45 0.45 h 5.89 v 0.45 c 0 0.25 0.2 0.45 0.45 0.45 h 0.91 c 0.25 0 0.45 -0.2 0.45 -0.45 v -0.45 h 5.89 c 0.25 0 0.45 -0.2 0.45 -0.45 v -0.91 c 0 -0.25 -0.2 -0.45 -0.45 -0.45 z',
            container: 'modificationSettingsDiv',
            handleModificationUpdate: () => {
                return ModelTask.commit('SETTINGS', ControlsConstants.createWorkerInput());
            },
            getModificationResolver: () => {
                return new ModificationResolverSettings();
            },
            handleModificationDrag: () => { },
            showInEditor: modification => ControlsSettings.getInstance().acceptModification(modification as ModificationSettings),
            labellingDefinition: ControlsConstants.LABEL_ABSOLUTE_FIXED
        }
        // 'HOSPITAL' M 5.034 -1.774 H -1.162 C -1.375 -1.774 -1.549 -1.6 -1.549 -1.387 V 2.098 H -6.195 V -3.71 C -6.195 -3.923 -6.369 -4.098 -6.582 -4.098 H -7.357 C -7.57 -4.098 -7.744 -3.923 -7.744 -3.71 V 4.808 C -7.744 5.021 -7.57 5.195 -7.357 5.195 H -6.582 C -6.369 5.195 -6.195 5.021 -6.195 4.808 V 3.646 H 6.195 V 4.808 C 6.195 5.021 6.369 5.195 6.582 5.195 H 7.357 C 7.57 5.195 7.744 5.021 7.744 4.808 V 0.936 C 7.744 -0.562 6.532 -1.774 5.034 -1.774 Z M -4.453 -4.872 H -1.401 L -0.733 -3.536 C -0.59 -3.251 -0.184 -3.251 -0.041 -3.536 L 1.162 -5.942 L 1.696 -4.872 H 4.646 C 4.859 -4.872 5.034 -5.046 5.034 -5.259 S 4.859 -5.646 4.646 -5.646 H 2.176 L 1.508 -6.982 C 1.365 -7.268 0.958 -7.268 0.816 -6.982 L -0.387 -4.577 L -0.869 -5.54 C -0.903 -5.605 -0.968 -5.646 -1.043 -5.646 H -4.453 C -4.559 -5.646 -4.646 -5.559 -4.646 -5.453 V -5.066 C -4.646 -4.959 -4.559 -4.872 -4.453 -4.872 Z M -3.872 1.323 C -3.018 1.323 -2.323 0.629 -2.323 -0.226 S -3.018 -1.774 -3.872 -1.774 S -5.421 -1.08 -5.421 -0.226 S -4.726 1.323 -3.872 1.323 Z
    };

    static readonly BULLET_CIRCLE = 'M 0 -12.4 C -6.85 -12.4 -12.4 -6.85 -12.4 0 S -6.85 12.4 0 12.4 S 12.4 6.85 12.4 0 S 6.85 -12.4 0 -12.4 Z';
    static readonly BULLET____PIN = 'M -1.275 20.0091 C -10.6633 6.3989 -12.4059 5.0021 -12.4059 0 C -12.4059 -6.8516 -6.8516 -12.4059 0 -12.4059 s 12.4059 5.5543 12.4059 12.4059 c 0 5.0019 -1.7427 6.3989 -11.1308 20.0091 c -0.6162 0.89 -1.9339 0.8899 -2.5499 0 z';
    static readonly ICON_____ZOOM = 'M4.3898-3.0982V-1.44H-4.39V-3.0982C-4.39-3.8678-5.3205-4.2533-5.8648-3.7092L-8.963-.611C-9.3004-.2734-9.3004.2734-8.963.611L-5.8648 3.709C-5.3206 4.2533-4.39 3.8678-4.39 3.0982V1.44H4.3898V3.0982C4.3898 3.8678 5.3205 4.2533 5.8648 3.7092L8.963.611C9.3004.2736 9.3004-.2734 8.963-.611L5.8648-3.709C5.3205-4.2533 4.3898-3.8678 4.3898-3.0982Z';
    static readonly ICON___FLOPPY = 'M 9.0694 -5.4821 l -3.6236 -3.6478 A 2.0874 2.0736 90 0 0 3.9796 -9.7414 H -7.6032 C -8.7485 -9.7414 -9.6768 -8.8068 -9.6768 -7.6538 v 15.3078 c 0 1.1528 0.9283 2.0874 2.0736 2.0874 h 15.2064 c 1.1453 0 2.0736 -0.9346 2.0736 -2.0874 V -4.0061 a 2.0874 2.0736 90 0 0 -0.6074 -1.476 z M 0 6.9581 c -1.5269 0 -2.7648 -1.2462 -2.7648 -2.7833 c 0 -1.5371 1.2379 -2.7833 2.7648 -2.7833 s 2.7648 1.2462 2.7648 2.7833 c 0 1.5371 -1.2379 2.7833 -2.7648 2.7833 z m 4.1472 -13.243 V -1.9135 c 0 0.2881 -0.2323 0.5219 -0.5184 0.5219 H -6.3936 c -0.2863 0 -0.5184 -0.2338 -0.5184 -0.5219 V -6.4362 c 0 -0.2881 0.2323 -0.5219 0.5184 -0.5219 h 9.872 c 0.1376 0 0.2693 0.055 0.3665 0.1529 l 0.1504 0.1513 A 0.5215 0.5183 90 0 1 4.1472 -6.2849 z';

    static readonly FONT_FAMILY: string = 'Courier Prime Sans';
    static readonly FONT_SIZE: number = 14;
    static readonly COLOR____FONT: string = '#d1d1d1';
    static readonly COLOR______BG = '#121212';

    static createWorkerInput(): IWorkerInput {
        return {
            minInstant: ModelInstants.getInstance().getMinInstant(), // SliderModification.getInstance().getMinValue(),
            maxInstant: ModelInstants.getInstance().getMaxInstant(),
            demographicsConfig: Demographics.getInstance().getDemographicsConfig(),
            modificationValues: Modifications.getInstance().buildModificationValues(),
            baseDataConfig: BaseData.getInstance().getBaseDataConfig(),
            workerMode: QueryUtil.getInstance().getWorkerMode(),
            fitterParams: {
                maxErrorTolerance: 0.20,
                curErrorCalculate: Number.MAX_VALUE
            }
        }
    }

}
