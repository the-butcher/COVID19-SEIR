import { Demographics } from '../../common/demographics/Demographics';
import { IModification } from '../../common/modification/IModification';
import { IModificationValues } from '../../common/modification/IModificationValues';
import { ModificationContact } from '../../common/modification/ModificationContact';
import { ModificationResolverContact } from '../../common/modification/ModificationResolverContact';
import { ModificationResolverSettings } from '../../common/modification/ModificationResolverSettings';
import { ModificationResolverVaccination } from '../../common/modification/ModificationResolverVaccination';
import { ModificationSeasonality } from '../../common/modification/ModificationSeasonality';
import { ModificationSettings } from '../../common/modification/ModificationSettings';
import { ModificationStrain } from '../../common/modification/ModificationStrain';
import { ModificationTesting } from '../../common/modification/ModificationTesting';
import { ModificationTime } from '../../common/modification/ModificationTime';
import { ModificationVaccination } from '../../common/modification/ModificationVaccination';
import { ModelConstants, MODIFICATION____KEY } from '../../model/ModelConstants';
import { Color } from '../../util/Color';
import { TimeUtil } from '../../util/TimeUtil';
import { ChartAgeGroup, IModificationData } from '../chart/ChartAgeGroup';
import { ControlsContact } from '../controls/ControlsContact';
import { ControlsSeasonality } from '../controls/ControlsSeasonality';
import { ControlsSettings } from '../controls/ControlsSettings';
import { ControlsStrain } from '../controls/ControlsStrain';
import { ControlsTesting } from '../controls/ControlsTesting';
import { ControlsTime } from '../controls/ControlsTime';
import { ControlsVaccination } from '../controls/ControlsVaccination';
import { ModelTask } from '../ModelTask';
import { IModificationResolver } from './../../common/modification/IModificationResolver';
import { ModificationResolverSeasonality } from './../../common/modification/ModificationResolverSeasonality';
import { ModificationResolverStrain } from './../../common/modification/ModificationResolverStrain';
import { ModificationResolverTesting } from './../../common/modification/ModificationResolverTesting';
import { ModificationResolverTime } from './../../common/modification/ModificationResolverTime';
import { Modifications } from './../../common/modification/Modifications';
import { IDataItem } from './../../model/state/ModelStateIntegrator';
import { ObjectUtil } from './../../util/ObjectUtil';
import { SliderModification } from './SliderModification';

export interface IControlsDefinitions {
    icon: string;
    container: string;
    handleModificationUpdate: () => Promise<void>;
    handleModificationDrag: (instant: number) => void;
    createModificationResolver: () => IModificationResolver<IModificationValues, IModification<IModificationValues>>,
    showInEditor?: (modification: IModification<IModificationValues>) => void;
    labellingDefinition: ILabellingDefinition;
}
export interface IControlsChartDefinition {
    min: number;
    max: number;
    labellingDefinition: ILabellingDefinition;
    color: string;
    text: string;
    useObjectColors: boolean;
}

export interface IHeatmapColorDefinition {
    id: string,
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

export type CHART_MODE______KEY = 'INCIDENCE' | 'SEIR' | 'EI' | 'VACC';
export type COMPARTMENT__COLORS = 'SUSCEPTIBLE' | 'EXPOSED' | 'INFECTIOUS' | 'REMOVED' | 'RECOVERED' | 'HOME' | 'HOSPITALIZED' | 'DEAD' | 'INCIDENCE' | 'CASES' | MODIFICATION____KEY;

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
    static readonly LOCALE_FORMAT_FIXED = {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    };

    static readonly LABEL_PERCENT__FLOAT_2: ILabellingDefinition = {
        format: value => `${(value * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_2)}%`
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

    static readonly COLORS: {[K in COMPARTMENT__COLORS]:string} = {
        'SUSCEPTIBLE': '#0e77d4',
        'EXPOSED': '#bb890c',
        'INFECTIOUS': '#da0edf',
        'REMOVED': '#83ca0d',
        'RECOVERED': '#0cbba8',
        'HOME': '#9fbec8',
        'HOSPITALIZED': '#0c90bb',
        'DEAD': '#0e1d22',
        'INCIDENCE': '#df5f5f',
        'CASES': '#acb00b',
        'TIME': '#aaaaaa',
        'STRAIN': '#b012bb',
        'CONTACT': '#f43f3f',
        'TESTING': '#29c437',
        'VACCINATION': '#0c90bb',
        'SEASONALITY': '#dbd905',
        'SETTINGS': '#687580'
    };

    static readonly HEATMAP_______PLAIN: IHeatmapColorDefinition = {
        id: ObjectUtil.createId(),
        getHeatColor: (value) => new Color(0.0, 0.0, Math.min(1.0, (10 + Math.round(value * 90)) / 100)).getHex()
    }

    static readonly HEATMAP_DATA_PARAMS: {[K in CHART_MODE______KEY]: IHeatmapChartDefinition} = {
        'SEIR': {
            id: ObjectUtil.createId(),
            getHeatValue: (dataItem, ageGroupName) => dataItem.valueset[ageGroupName].SUSCEPTIBLE,
            getHeatLabel: (value) => `${(value * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_2)}%`,
            getHeatColor: (value) => new Color(0.58, Math.min(0.75, value), Math.min(1.0, (10 + Math.round(value * 90)) / 100)).getHex(),
            getHeatMax: () => 1,
            visitChart: (chart) => {
                chart.setSeriesIncidenceVisible(false);
                chart.setSeriesEIVisible(false);
                chart.setSeriesSRVisible(true);
                chart.setAxisRelativeMax(1.01);
            }
        },
        'EI': {
            id: ObjectUtil.createId(),
            getHeatValue: (dataItem, ageGroupName) => dataItem.valueset[ageGroupName].INFECTIOUS[ModelConstants.STRAIN_ID_____ALL],
            getHeatLabel: (value) => `${(value * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_2)}%`,
            getHeatColor: (value) => new Color(0.83, Math.min(0.75, value), Math.min(1.0, (10 + Math.round(value * 90)) / 100)).getHex(),
            getHeatMax: (maxValue) => maxValue,
            visitChart: (chart) => {
                chart.setSeriesIncidenceVisible(false);
                chart.setSeriesSRVisible(false);
                chart.setSeriesEIVisible(true);
                chart.setAxisRelativeMax(chart.getMaxInfections() * 1.01);
            }
        },
        'INCIDENCE': {
            id: ObjectUtil.createId(),
            getHeatValue: (dataItem, ageGroupName) => dataItem.valueset[ageGroupName].INCIDENCES[ModelConstants.STRAIN_ID_____ALL],
            getHeatLabel: (value) => `${value.toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FIXED)}`,
            getHeatColor: (value) => new Color(0.00, 0.00, Math.min(1.0, (10 + Math.round(value * 90)) / 100)).getHex(),
            getHeatMax: (maxValue) => maxValue,
            visitChart: (chart) => {
                chart.setSeriesIncidenceVisible(true);
                chart.setSeriesEIVisible(false);
                chart.setSeriesSRVisible(false);
            }
        },
        'VACC': {
            id: ObjectUtil.createId(),
            getHeatValue: (dataItem, ageGroupName) => dataItem.valueset[ageGroupName].REMOVED_V,
            getHeatLabel: (value) => `${(value * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_2)}%`,
            getHeatColor: (value) => new Color(0.23, Math.min(0.75, value), Math.min(1.0, (10 + Math.round(value * 90)) / 100)).getHex(),
            getHeatMax: () => 1,
            visitChart: (chart) => {
                chart.setSeriesIncidenceVisible(false);
                chart.setSeriesEIVisible(false);
                chart.setSeriesSRVisible(true);
                chart.setAxisRelativeMax(1.01);
            }
        }
    }

    static readonly MODIFICATION_PARAMS: {[K in MODIFICATION____KEY]: IControlsDefinitions} = {
        'TIME': {
            icon: 'M 4.62 3.25 H 4.62 L 3.62 4.5 A 0.8 0.8 90 0 1 2.5 4.63 H 2.5 L -0.85 2.14 A 2 2 90 0 1 -1.6 0.58 V -7.2 A 0.8 0.8 90 0 1 -0.8 -8 H 0.8 A 0.8 0.8 90 0 1 1.6 -7.2 V 0 L 4.5 2.13 A 0.8 0.8 90 0 1 4.62 3.25 Z',
            container: 'modificationTimeDiv',
            handleModificationUpdate: () => {
                console.log('time updated')
                return null;
            },
            handleModificationDrag: (instant: number) => {
                ChartAgeGroup.getInstance().setInstant(instant);
            },
            createModificationResolver: () => new ModificationResolverTime(),
            showInEditor: modification => ControlsTime.getInstance().acceptModification(modification as ModificationTime),
            labellingDefinition: ControlsConstants.LABEL_ABSOLUTE_FIXED
        },
        'STRAIN': {
            icon: 'M 7.85 -0.98 H 7.1 c -1.75 0 -2.62 -2.11 -1.39 -3.35 L 6.24 -4.86 A 0.98 0.98 90 0 0 4.86 -6.24 L 4.33 -5.72 c -1.24 1.24 -3.35 0.36 -3.35 -1.39 V -7.85 a 0.98 0.98 90 0 0 -1.96 0 V -7.1 c 0 1.75 -2.11 2.62 -3.35 1.39 L -4.86 -6.24 A 0.98 0.98 90 0 0 -6.24 -4.86 l 0.53 0.53 c 1.24 1.24 0.36 3.35 -1.39 3.35 H -7.85 a 0.98 0.98 90 1 0 0 1.96 H -7.1 c 1.75 0 2.62 2.11 1.39 3.35 L -6.24 4.86 A 0.98 0.98 90 0 0 -4.86 6.24 l 0.53 -0.53 c 1.24 -1.24 3.35 -0.36 3.35 1.39 v 0.74 a 0.98 0.98 90 0 0 1.96 0 V 7.1 c 0 -1.75 2.11 -2.62 3.35 -1.39 L 4.86 6.24 A 0.98 0.98 90 0 0 6.24 4.86 l -0.53 -0.53 c -1.24 -1.24 -0.36 -3.35 1.39 -3.35 h 0.74 a 0.98 0.98 90 1 0 0 -1.96 Z M -1.1 0.55 a 1.66 1.66 90 1 1 1.66 -1.66 A 1.66 1.66 90 0 1 -1.1 0.55 Z m 2.76 1.93 a 0.83 0.83 90 1 1 0.83 -0.83 A 0.83 0.83 90 0 1 1.66 2.48 Z',
            container: 'modificationStrainDiv',
            handleModificationUpdate: () => {
                return ModelTask.commit('STRAIN', Demographics.getInstance().getDemographicsConfig(), Modifications.getInstance().buildModificationValues());
            },
            handleModificationDrag: () => {},
            createModificationResolver: () => new ModificationResolverStrain(),
            showInEditor: modification => ControlsStrain.getInstance().acceptModification(modification as ModificationStrain),
            labellingDefinition: ControlsConstants.LABEL_ABSOLUTE_FLOAT_2
        },
        'CONTACT': {
            icon: 'M -5.38 -4.08 A 1.79 1.79 90 1 0 -7.17 -5.88 A 1.79 1.79 90 0 0 -5.38 -4.08 Z M -5.38 0.85 A 1.24 1.24 90 0 1 -4.99 -0.05 L -2.97 -1.96 C -2.93 -2 -2.87 -2.02 -2.82 -2.06 A 1.79 1.79 90 0 0 -4.48 -3.19 H -6.27 A 1.79 1.79 90 0 0 -8.06 -1.4 V 1.29 A 0.9 0.9 90 0 0 -7.17 2.19 V 5.77 A 0.9 0.9 90 0 0 -6.27 6.67 H -4.48 A 0.9 0.9 90 0 0 -3.58 5.77 V 3.07 L -4.99 1.74 A 1.23 1.23 90 0 1 -5.38 0.85 Z M 5.38 -4.08 A 1.79 1.79 90 1 0 3.58 -5.88 A 1.79 1.79 90 0 0 5.38 -4.08 Z M 6.27 -3.19 H 4.48 A 1.79 1.79 90 0 0 2.82 -2.06 C 2.87 -2.02 2.93 -2 2.97 -1.96 L 4.99 -0.05 A 1.24 1.24 90 0 1 4.99 1.74 L 3.58 3.07 V 5.77 A 0.9 0.9 90 0 0 4.48 6.67 H 6.27 A 0.9 0.9 90 0 0 7.17 5.77 V 2.19 A 0.9 0.9 90 0 0 8.06 1.29 V -1.4 A 1.79 1.79 90 0 0 6.27 -3.19 Z M 4.38 0.6 L 2.36 -1.3 A 0.34 0.34 90 0 0 1.79 -1.06 V -0.05 H -1.79 V -1.06 A 0.34 0.34 90 0 0 -2.36 -1.3 L -4.38 0.6 A 0.35 0.35 90 0 0 -4.38 1.09 L -2.36 3 A 0.34 0.34 90 0 0 -1.79 2.75 V 1.74 H 1.79 V 2.75 A 0.34 0.34 90 0 0 2.36 3 L 4.38 1.09 A 0.35 0.35 90 0 0 4.38 0.6 Z',
            container: 'modificationContactDiv',
            handleModificationUpdate: () => {
                return ModelTask.commit('STRAIN', Demographics.getInstance().getDemographicsConfig(), Modifications.getInstance().buildModificationValues());
            },
            handleModificationDrag: () => {},
            createModificationResolver: () => new ModificationResolverContact(),
            showInEditor: modification => ControlsContact.getInstance().acceptModification(modification as ModificationContact),
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2
        },
        'TESTING': {
            icon: 'M 7.98 -2.66 L 2.65 -7.98 C 2.55 -8.08 2.39 -8.08 2.29 -7.98 L 1.22 -6.91 C 1.12 -6.81 1.12 -6.65 1.22 -6.55 L 1.57 -6.2 L -6.11 1.47 C -7.34 2.69 -7.54 4.7 -6.41 6.01 C -5.75 6.77 -4.84 7.15 -3.92 7.15 C -3.09 7.15 -2.25 6.83 -1.61 6.2 L 6.19 -1.59 L 6.55 -1.24 C 6.64 -1.14 6.8 -1.14 6.9 -1.24 L 7.98 -2.31 C 8.08 -2.4 8.08 -2.57 7.98 -2.66 Z M 2.92 -0.45 H -2.05 L 2.64 -5.13 L 5.12 -2.65 L 2.92 -0.45 Z',
            container: 'modificationTestingDiv',
            handleModificationUpdate: () => {
                return ModelTask.commit('STRAIN', Demographics.getInstance().getDemographicsConfig(), Modifications.getInstance().buildModificationValues());
            },
            handleModificationDrag: () => {},
            createModificationResolver: () => new ModificationResolverTesting(),
            showInEditor: modification => ControlsTesting.getInstance().acceptModification(modification as ModificationTesting),
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2
        },
        'VACCINATION': {
            icon: 'm -1.68 -2.5 l 1.72 1.72 c 0.09 0.09 0.09 0.25 0 0.35 l -0.35 0.34 c -0.1 0.1 -0.25 0.1 -0.35 0 l -1.71 -1.71 l -1.4 1.39 l 1.72 1.72 c 0.09 0.09 0.09 0.25 0 0.35 l -0.35 0.34 c -0.09 0.1 -0.25 0.1 -0.35 0 l -1.72 -1.72 l -0.81 0.82 c -0.53 0.53 -0.79 1.26 -0.71 2.01 l 0.22 1.96 l -2.04 2.04 c -0.1 0.1 -0.1 0.26 0 0.35 l 0.34 0.35 c 0.1 0.1 0.26 0.1 0.35 0 l 2.04 -2.04 l 1.96 0.22 c 0.74 0.08 1.48 -0.17 2.02 -0.71 l 5.6 -5.6 l -4.18 -4.18 l -2 2 z m 9.49 -2.87 l -2.44 -2.44 c -0.09 -0.1 -0.25 -0.1 -0.34 0 l -0.35 0.34 c -0.1 0.1 -0.1 0.26 0 0.35 l 0.87 0.87 l -1.39 1.4 l -1.75 -1.74 l -0.52 -0.53 c -0.1 -0.09 -0.25 -0.09 -0.35 0 l -1.04 1.05 c -0.1 0.09 -0.1 0.25 0 0.34 l 0.52 0.53 l 4.18 4.18 l 0.52 0.53 c 0.1 0.09 0.26 0.09 0.35 0 l 1.04 -1.05 c 0.1 -0.1 0.1 -0.25 0 -0.35 l -2.26 -2.26 l 1.4 -1.4 l 0.87 0.87 c 0.09 0.1 0.25 0.1 0.35 0 l 0.34 -0.34 c 0.1 -0.1 0.1 -0.26 0 -0.35 z',
            container: 'modificationVaccinationDiv',
            handleModificationUpdate: () => {
                return ModelTask.commit('STRAIN', Demographics.getInstance().getDemographicsConfig(), Modifications.getInstance().buildModificationValues());
            },
            handleModificationDrag: () => {},
            createModificationResolver: () => new ModificationResolverVaccination(),
            showInEditor: modification => ControlsVaccination.getInstance().acceptModification(modification as ModificationVaccination),
            labellingDefinition: ControlsConstants.LABEL_ABSOLUTE_FIXED
        },
        'SEASONALITY': {
            icon: 'M 3.73 5.81 c -2.35 0 -3.44 -2.8 -4.5 -5.5 C -1.59 -1.78 -2.52 -4.15 -3.73 -4.15 c -1.03 0 -2.37 2.12 -2.96 3.86 a 0.41 0.41 90 0 1 -0.51 0.27 l -0.8 -0.24 A 0.41 0.41 90 0 1 -8.27 -0.79 C -7.79 -2.23 -6.16 -5.81 -3.73 -5.81 c 2.35 0 3.44 2.8 4.5 5.5 C 1.59 1.78 2.52 4.15 3.73 4.15 c 1.03 0 2.37 -2.12 2.96 -3.86 a 0.41 0.41 90 0 1 0.51 -0.27 l 0.8 0.24 a 0.41 0.41 90 0 1 0.27 0.53 C 7.79 2.23 6.16 5.81 3.73 5.81 z',
            container: 'modificationSeasonalityDiv',
            handleModificationUpdate: () => {
                return ModelTask.commit('STRAIN', Demographics.getInstance().getDemographicsConfig(), Modifications.getInstance().buildModificationValues());
            },
            handleModificationDrag: () => {},
            createModificationResolver: () => new ModificationResolverSeasonality(),
            showInEditor: modification => ControlsSeasonality.getInstance().acceptModification(modification as ModificationSeasonality),
            labellingDefinition: ControlsConstants.LABEL_PERCENT__FLOAT_2
        },
        'SETTINGS': {
            icon: 'm 6.8 3.62 h -9.52 v -0.45 c 0 -0.25 -0.2 -0.45 -0.45 -0.45 h -0.91 c -0.25 0 -0.45 0.2 -0.45 0.45 v 0.45 h -2.27 c -0.25 0 -0.45 0.2 -0.45 0.45 v 0.91 c 0 0.25 0.2 0.45 0.45 0.45 h 2.27 v 0.45 c 0 0.25 0.2 0.45 0.45 0.45 h 0.91 c 0.25 0 0.45 -0.2 0.45 -0.45 v -0.45 h 9.51 c 0.25 0 0.45 -0.2 0.45 -0.45 v -0.91 c 0 -0.25 -0.2 -0.45 -0.45 -0.45 z m 0 -4.53 h -2.27 v -0.45 c 0 -0.25 -0.2 -0.45 -0.45 -0.45 h -0.91 c -0.25 0 -0.45 0.2 -0.45 0.45 v 0.45 h -9.52 c -0.25 0 -0.45 0.2 -0.45 0.45 v 0.91 c 0 0.25 0.2 0.45 0.45 0.45 h 9.51 v 0.45 c 0 0.25 0.2 0.45 0.45 0.45 h 0.91 c 0.25 0 0.45 -0.2 0.45 -0.45 v -0.45 h 2.27 c 0.25 0 0.45 -0.2 0.45 -0.45 v -0.91 c 0 -0.25 -0.2 -0.45 -0.45 -0.45 z m 0 -4.53 h -5.89 v -0.45 c 0 -0.25 -0.2 -0.45 -0.45 -0.45 h -0.91 c -0.25 0 -0.45 0.2 -0.45 0.45 v 0.45 h -5.9 c -0.24 -0 -0.45 0.21 -0.45 0.46 v 0.91 c 0 0.25 0.2 0.45 0.45 0.45 h 5.89 v 0.45 c 0 0.25 0.2 0.45 0.45 0.45 h 0.91 c 0.25 0 0.45 -0.2 0.45 -0.45 v -0.45 h 5.89 c 0.25 0 0.45 -0.2 0.45 -0.45 v -0.91 c 0 -0.25 -0.2 -0.45 -0.45 -0.45 z',
            container: 'modificationSettingsDiv',
            handleModificationUpdate: () => {
                return ModelTask.commit('STRAIN', Demographics.getInstance().getDemographicsConfig(), Modifications.getInstance().buildModificationValues());
            },
            handleModificationDrag: () => {},
            createModificationResolver: () => new ModificationResolverSettings(),
            showInEditor: modification => ControlsSettings.getInstance().acceptModification(modification as ModificationSettings),
            labellingDefinition: ControlsConstants.LABEL_ABSOLUTE_FIXED
        }
    };

    static readonly BULLET_CIRCLE = 'M 0 -12.4 C -6.85 -12.4 -12.4 -6.85 -12.4 0 S -6.85 12.4 0 12.4 S 12.4 6.85 12.4 0 S 6.85 -12.4 0 -12.4 Z';
    static readonly BULLET____PIN = 'M -1.275 20.0091 C -10.6633 6.3989 -12.4059 5.0021 -12.4059 0 C -12.4059 -6.8516 -6.8516 -12.4059 0 -12.4059 s 12.4059 5.5543 12.4059 12.4059 c 0 5.0019 -1.7427 6.3989 -11.1308 20.0091 c -0.6162 0.89 -1.9339 0.8899 -2.5499 0 z';
    static readonly ICON_____ZOOM = 'M4.3898-3.0982V-1.44H-4.39V-3.0982C-4.39-3.8678-5.3205-4.2533-5.8648-3.7092L-8.963-.611C-9.3004-.2734-9.3004.2734-8.963.611L-5.8648 3.709C-5.3206 4.2533-4.39 3.8678-4.39 3.0982V1.44H4.3898V3.0982C4.3898 3.8678 5.3205 4.2533 5.8648 3.7092L8.963.611C9.3004.2736 9.3004-.2734 8.963-.611L5.8648-3.709C5.3205-4.2533 4.3898-3.8678 4.3898-3.0982Z';
    static readonly ICON___FLOPPY = 'M 9.0694 -5.4821 l -3.6236 -3.6478 A 2.0874 2.0736 90 0 0 3.9796 -9.7414 H -7.6032 C -8.7485 -9.7414 -9.6768 -8.8068 -9.6768 -7.6538 v 15.3078 c 0 1.1528 0.9283 2.0874 2.0736 2.0874 h 15.2064 c 1.1453 0 2.0736 -0.9346 2.0736 -2.0874 V -4.0061 a 2.0874 2.0736 90 0 0 -0.6074 -1.476 z M 0 6.9581 c -1.5269 0 -2.7648 -1.2462 -2.7648 -2.7833 c 0 -1.5371 1.2379 -2.7833 2.7648 -2.7833 s 2.7648 1.2462 2.7648 2.7833 c 0 1.5371 -1.2379 2.7833 -2.7648 2.7833 z m 4.1472 -13.243 V -1.9135 c 0 0.2881 -0.2323 0.5219 -0.5184 0.5219 H -6.3936 c -0.2863 0 -0.5184 -0.2338 -0.5184 -0.5219 V -6.4362 c 0 -0.2881 0.2323 -0.5219 0.5184 -0.5219 h 9.872 c 0.1376 0 0.2693 0.055 0.3665 0.1529 l 0.1504 0.1513 A 0.5215 0.5183 90 0 1 4.1472 -6.2849 z';

    static readonly FONT_FAMILY: string = 'Courier Prime Sans';
    static readonly FONT_SIZE: number = 14;
    static readonly COLOR____FONT: string = '#d1d1d1';
    static readonly COLOR______BG = '#121212';

    static rebuildModificationChart(modificationResolver: IModificationResolver<IModificationValues, IModification<IModificationValues>>): void {

        const minChartInstant = SliderModification.getInstance().getMinValue();
        const maxChartInstant = SliderModification.getInstance().getMaxValue();

        const modificationData: IModificationData[] = [];
        for (let instant = minChartInstant; instant <= maxChartInstant; instant += TimeUtil.MILLISECONDS_PER____DAY) {
            modificationData.push({
                modValueY: modificationResolver.getValue(instant),
                categoryX: TimeUtil.formatCategoryDate(instant)
            });
        }

        // console.log('modificationData', modificationData);

        const max = modificationResolver.getMaxValue(modificationData);
        const key = modificationResolver.getKey();
        ChartAgeGroup.getInstance().showModifications({
            min: 0,
            max,
            labellingDefinition: ControlsConstants.MODIFICATION_PARAMS[modificationResolver.getKey()].labellingDefinition,
            text: key,
            color: ControlsConstants.COLORS[key],
            useObjectColors: true,
        }, modificationData);

    }

}
