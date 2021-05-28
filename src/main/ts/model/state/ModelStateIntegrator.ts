import { ModificationPrefill } from '../../common/modification/ModificationPrefill';
import { Modifications } from '../../common/modification/Modifications';
import { ModificationSettings } from '../../common/modification/ModificationSettings';
import { ObjectUtil } from '../../util/ObjectUtil';
import { TimeUtil } from '../../util/TimeUtil';
import { CompartmentFilter } from '../compartment/CompartmentFilter';
import { ECompartmentType } from '../compartment/ECompartmentType';
import { ModelConstants } from '../ModelConstants';
import { ModelImplRoot } from '../ModelImplRoot';
import { IModificationValuesStrain } from './../../common/modification/IModificationValuesStrain';
import { ModificationTime } from './../../common/modification/ModificationTime';
import { IModelState } from './IModelState';

/**
 * definition for a type that hold model progress and, if complete, model data
 */
export interface IModelProgress {
    ratio: number;
    data?: any[];
}

export interface IDataItem {
    categoryX: string,
    valueset: { [K: string]: IDataValues }
}
export interface IDataValues {
    SUSCEPTIBLE: number,
    EXPOSED: number,
    INFECTIOUS: number,
    REMOVED_D: number,
    REMOVED_U: number,
    REMOVED_V: number,
    CASES: number,
    INCIDENCES: { [K: string]: number }
}

/**
 * performs an euler-integration in 1 hour steps on a model-state
 *
 * @author h.fleischer
 * @since 16.05.2021
 */
export class ModelStateIntegrator {

    static readonly DT = TimeUtil.MILLISECONDS_PER____DAY / 24;

    private readonly model: ModelImplRoot;
    private curInstant: number;

    private readonly modelState: IModelState;

    constructor(model: ModelImplRoot, curInstant: number) {
        this.model = model;
        this.curInstant = curInstant;
        this.modelState = model.getInitialState();
    }

    integrate(dT: number, tT: number): void {

        const modificationTime = new ModificationTime({
            id: ObjectUtil.createId(),
            key: 'TIME',
            instant: tT,
            name: 'step',
            deletable: false,
            draggable: false
        });
        modificationTime.setInstants(tT, tT); // tT, tT is by purpose, standing for instant, instant

        this.modelState.add(this.model.apply(this.modelState, dT, tT, modificationTime));

    }

    getModelState(): IModelState {
        return this.modelState;
    }

    /**
     * fill the model with vaccinated individuals until the amount configured in settings is fulfilled
     * @param multiplier
     */
    async prefillVaccination(): Promise<void> {

        const modificationSettings = Modifications.getInstance().findModificationsByType('SETTINGS')[0] as ModificationSettings;
        const vaccinationRatioDest = modificationSettings.getVaccinated();
        let vaccinationRatioCurr = 0;

        const compartmentFilterRemovedVTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.R___REMOVED_V));

        vaccinationRatioCurr = this.modelState.getNrmValueSum(compartmentFilterRemovedVTotal);
        // console.log('vaccinationRatioCurr', vaccinationRatioCurr);

        let vaccinationRatioCurr1;
        let loopBuster = 0;
        while (vaccinationRatioCurr < vaccinationRatioDest && loopBuster < 1000) {

            // TODO better exit criteria upon reaching refusal threshold

            this.modelState.add(this.model.applyVaccination(this.modelState, ModelStateIntegrator.DT, -1, new ModificationPrefill()));
            vaccinationRatioCurr1 = this.modelState.getNrmValueSum(compartmentFilterRemovedVTotal);
            if (vaccinationRatioCurr1 > 0 && vaccinationRatioCurr1 === vaccinationRatioCurr) {
                break; // probably reached the refusal threshold
            }
            vaccinationRatioCurr = vaccinationRatioCurr1;

            loopBuster++;

        }

    }

    async buildModelData(dstInstant: number, dataFilter: (curInstant: number) => boolean, progressCallback: (progress: IModelProgress) => void): Promise<IDataItem[]> {

        const dataSet: IDataItem[] = [];
        const absTotal = this.model.getDemographics().getAbsTotal();

        // const compartmentFilterRemovedVInit = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.R___REMOVED_V));
        // console.log('v-init', this.modelState.getNrmValueSum(compartmentFilterRemovedVInit));

        const modificationValuesStrain = Modifications.getInstance().findModificationsByType('STRAIN').map(m => m.getModificationValues() as IModificationValuesStrain);

        for (; this.curInstant <= dstInstant; this.curInstant += ModelStateIntegrator.DT) {

            this.integrate(ModelStateIntegrator.DT, this.curInstant);
            if (dataFilter(this.curInstant)) { //  this.curInstant % TimeUtil.MILLISECONDS_PER_DAY === 0

                const compartmentFilterSusceptibleTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.S_SUSCEPTIBLE));
                const compartmentFilterExposedTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.E_____EXPOSED));
                const compartmentFilterInfectiousTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.I__INFECTIOUS));
                const compartmentFilterRemovedDTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.R___REMOVED_D));
                const compartmentFilterRemovedUTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.R___REMOVED_U));
                const compartmentFilterRemovedVTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.R___REMOVED_V));
                const compartmentFilterCasesTotal = new CompartmentFilter(c => c.getCompartmentType() === ECompartmentType.X__INCUBATE_0);
                const compartmentFilterIncidenceTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.X__INCUBATE_0 || c.getCompartmentType() === ECompartmentType.X__INCUBATE_N));

                const removedDTotal = this.modelState.getNrmValueSum(compartmentFilterRemovedDTotal);
                const removedUTotal = this.modelState.getNrmValueSum(compartmentFilterRemovedUTotal);
                const removedVTotal = this.modelState.getNrmValueSum(compartmentFilterRemovedVTotal);

                const incidences: {[K: string]: number} = {};
                incidences[ModelConstants.STRAIN_ID_____ALL] = this.modelState.getNrmValueSum(compartmentFilterIncidenceTotal) * absTotal * 100000 / absTotal;
                modificationValuesStrain.forEach(modificationValueStrain => {
                    const compartmentFilterIncidenceTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.X__INCUBATE_0 || c.getCompartmentType() === ECompartmentType.X__INCUBATE_N) && c.getStrainId() === modificationValueStrain.id);
                   incidences[modificationValueStrain.id] = this.modelState.getNrmValueSum(compartmentFilterIncidenceTotal) * absTotal * 100000 / absTotal;
                });
                const dataItem: IDataItem = {
                    categoryX: TimeUtil.formatCategoryDate(this.curInstant),
                    valueset: {}
                };
                dataItem.valueset[ModelConstants.AGEGROUP_NAME_ALL] = {
                    SUSCEPTIBLE: this.modelState.getNrmValueSum(compartmentFilterSusceptibleTotal),
                    EXPOSED: this.modelState.getNrmValueSum(compartmentFilterExposedTotal),
                    INFECTIOUS: this.modelState.getNrmValueSum(compartmentFilterInfectiousTotal),
                    REMOVED_D: removedDTotal,
                    REMOVED_U: removedUTotal,
                    REMOVED_V: removedVTotal,
                    CASES: this.modelState.getNrmValueSum(compartmentFilterCasesTotal) * absTotal,
                    INCIDENCES: incidences
                };

                this.model.getDemographics().getAgeGroups().forEach(ageGroup => {

                    const groupNormalizer = absTotal / ageGroup.getAbsValue();

                    const compartmentFilterSusceptible = new CompartmentFilter(c => c.getCompartmentType() === ECompartmentType.S_SUSCEPTIBLE && c.getAgeGroupIndex() === ageGroup.getIndex());
                    const compartmentFilterExposed = new CompartmentFilter(c => c.getCompartmentType() === ECompartmentType.E_____EXPOSED && c.getAgeGroupIndex() === ageGroup.getIndex());
                    const compartmentFilterInfectious = new CompartmentFilter(c => c.getCompartmentType() === ECompartmentType.I__INFECTIOUS && c.getAgeGroupIndex() === ageGroup.getIndex());
                    const compartmentFilterRemovedD = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.R___REMOVED_D) && c.getAgeGroupIndex() === ageGroup.getIndex());
                    const compartmentFilterRemovedU = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.R___REMOVED_U) && c.getAgeGroupIndex() === ageGroup.getIndex());
                    const compartmentFilterRemovedV = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.R___REMOVED_V && c.getAgeGroupIndex() === ageGroup.getIndex()));
                    const compartmentFilterCases = new CompartmentFilter(c => c.getCompartmentType() === ECompartmentType.X__INCUBATE_0 && c.getAgeGroupIndex() === ageGroup.getIndex());
                    const compartmentFilterIncidence = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.X__INCUBATE_0 || c.getCompartmentType() === ECompartmentType.X__INCUBATE_N) && c.getAgeGroupIndex() === ageGroup.getIndex());

                    const removedD = this.modelState.getNrmValueSum(compartmentFilterRemovedD) * groupNormalizer;
                    const removedU = this.modelState.getNrmValueSum(compartmentFilterRemovedU) * groupNormalizer;
                    const removedV = this.modelState.getNrmValueSum(compartmentFilterRemovedV) * groupNormalizer;

                    const incidencesAgeGroup: {[K: string]: number} = {};
                    incidencesAgeGroup[ModelConstants.STRAIN_ID_____ALL] = this.modelState.getNrmValueSum(compartmentFilterIncidence) * 100000 * groupNormalizer;
                    modificationValuesStrain.forEach(modificationValueStrain => {
                        const compartmentFilterIncidence = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.X__INCUBATE_0 || c.getCompartmentType() === ECompartmentType.X__INCUBATE_N) && c.getAgeGroupIndex() === ageGroup.getIndex() && c.getStrainId() === modificationValueStrain.id);
                        incidencesAgeGroup[modificationValueStrain.id] = this.modelState.getNrmValueSum(compartmentFilterIncidence) * 100000 * groupNormalizer;
                    });
                    dataItem.valueset[ageGroup.getName()] = {
                        SUSCEPTIBLE: this.modelState.getNrmValueSum(compartmentFilterSusceptible) * groupNormalizer,
                        EXPOSED: this.modelState.getNrmValueSum(compartmentFilterExposed) * groupNormalizer,
                        INFECTIOUS: this.modelState.getNrmValueSum(compartmentFilterInfectious) * groupNormalizer,
                        REMOVED_D: removedD,
                        REMOVED_U: removedU,
                        REMOVED_V: removedV,
                        CASES: this.modelState.getNrmValueSum(compartmentFilterCases) * absTotal,
                        INCIDENCES: incidencesAgeGroup
                    };


                });

                dataSet.push(dataItem);

            }

            if (this.curInstant % TimeUtil.MILLISECONDS_PER____DAY * 7 === 0) {
                progressCallback({
                    ratio: (this.curInstant - ModelConstants.MODEL_MIN_____INSTANT) / (ModelConstants.MODEL_MAX_____INSTANT - ModelConstants.MODEL_MIN_____INSTANT)
                });
            }

        }

        progressCallback({
            ratio: (this.curInstant - ModelConstants.MODEL_MIN_____INSTANT) / (ModelConstants.MODEL_MAX_____INSTANT - ModelConstants.MODEL_MIN_____INSTANT),
            data: dataSet
        });

        return dataSet;

    }

    // isValid(): boolean {
    //     let valid = true;
    //     this.modelState.isV forEach((value, compartment) => {
    //         valid = Number.isNaN(value) ? false : valid;
    //     });
    //     return valid;
    // }

    // getValue(index: number): number {
    //     const valueIterator = this.state.values();
    //     for (let i=0; i<index; i++) {
    //         valueIterator.next();
    //     }
    //     return valueIterator.next().value;
    // }

    // getNormalizedValueSum(...compartmentTypes: ECompartmentType2[]): number {
    //     let normalizedValueSum = 0;
    //     this.state.forEach((value, compartment) => {
    //         if (compartmentTypes.indexOf(compartment.getCompartmentType()) >= 0) {
    //             normalizedValueSum += value;
    //         }
    //     });
    //     return normalizedValueSum;
    // }

    // getAbsoluteValueSum(...compartmentTypes: ECompartmentType2[]): number {
    //     return this.getNormalizedValueSum(...compartmentTypes) * this.model.getPn();
    // }

    // getNormalizedValueSumStrain(strain: IStrain, ...compartmentTypes: ECompartmentType2[]): number {
    //     let normalizedValueSum = 0;
    //     this.state.forEach((value, compartment) => {
    //         if (compartmentTypes.indexOf(compartment.getCompartmentType()) >= 0 && compartment.getStrain() === strain) {
    //             normalizedValueSum += value;
    //         }
    //     });
    //     return normalizedValueSum;
    // }

    // getAbsoluteValueSumStrain(strain: IStrain, ...compartmentTypes: ECompartmentType2[]): number {
    //     return this.getNormalizedValueSumStrain(strain, ...compartmentTypes) * this.model.getPn();
    // }

    // getR0(tT: number): number {
    //     // TODO calculate a weighed average
    //     throw new Error("NI");
    //     // const shareOfB117 = this.getShareOfB117();
    //     // const shareOfCov2 = 1 - shareOfB117;
    //     // const rEfft0 = this.model.getREffCov2() * shareOfCov2 + this.model.getREffB117() * shareOfB117;
    //     // return rEfft0 * this.model.getInterventionSet().getMultiplier(tT);
    // }

    // getRT(tT: number): number {
    //     return this.getR0(tT) * this.getNormalizedValueSum(ECompartmentType2.S_SUSCEPTIBLE);
    // }




}