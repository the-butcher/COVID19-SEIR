import { Demographics } from '../../common/demographics/Demographics';
import { Modifications } from '../../common/modification/Modifications';
import { ModificationSettings } from '../../common/modification/ModificationSettings';
import { TimeUtil } from '../../util/TimeUtil';
import { CompartmentFilter } from '../compartment/CompartmentFilter';
import { ECompartmentType } from '../compartment/ECompartmentType';
import { ModelImplRoot } from '../ModelImplRoot';
import { IModelState } from './IModelState';

export interface IModelProgress {
    ratio: number;
    data?: any[];
}

/**
 * performs an euler-integration in 1 hour steps on a model-state
 *
 * @author h.fleischer
 * @since 16.05.2021
 */
export class ModelStateIntegrator {

    static readonly DT = TimeUtil.MILLISECONDS_PER_DAY / 24;


    private readonly model: ModelImplRoot;
    private readonly modelState: IModelState;

    constructor(model: ModelImplRoot) {
        this.model = model;
        this.modelState = model.getInitialState();
    }

    integrate(dT: number, tT: number): void {
        this.modelState.add(this.model.apply(this.modelState, dT, tT));
    }

    getModelState(): IModelState {
        return this.modelState;
    }

    async prefillVaccination(multiplier: number): Promise<void> {

        const modificationSettings = Modifications.getInstance().findModificationsByType('SETTINGS')[0] as ModificationSettings;
        const vaccinationRatioDest = modificationSettings.getVaccinated() * multiplier;
        let vaccinationRatioCurr = 0;

        const compartmentFilterRemovedVTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.R___REMOVED_V));

        vaccinationRatioCurr = this.modelState.getNrmValueSum(compartmentFilterRemovedVTotal);
        // console.log('vaccinationRatioCurr', vaccinationRatioCurr);

        let vaccinationRatioCurr1;
        let loopBuster = 0;
        while (vaccinationRatioCurr < vaccinationRatioDest && loopBuster < 1000) {

            this.modelState.add(this.model.applyVaccination(this.modelState, ModelStateIntegrator.DT, -1, 100000));
            vaccinationRatioCurr1 = this.modelState.getNrmValueSum(compartmentFilterRemovedVTotal);
            if (vaccinationRatioCurr1 > 0 && vaccinationRatioCurr1 === vaccinationRatioCurr) {
                break; // probably reached the refusal threshold
            }
            vaccinationRatioCurr = vaccinationRatioCurr1;

            loopBuster++;

        }

    }

    async buildModelData(modelSettings: Demographics, minInstant: number, maxInstant: number, progressCallback: (progress: IModelProgress) => void): Promise<any[]> {

        const data: any[] = [];

        // const compartmentFilterRemovedVInit = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.R___REMOVED_V));
        // console.log('v-init', this.modelState.getNrmValueSum(compartmentFilterRemovedVInit));

        // const modificationsStrain = Modifications.getInstance().findModificationsByType('STRAIN');
        // modificationsStrain.forEach(modificationStrain => {
        //     const strainValues = modificationStrain.getModificationValues() as IStrainValues;
        //     console.log('strainValues', strainValues);
        // });

        for (let tT = minInstant; tT <= maxInstant; tT += ModelStateIntegrator.DT) {

            this.integrate(ModelStateIntegrator.DT, tT);
            if (tT % TimeUtil.MILLISECONDS_PER_DAY === 0) { // TODO to constant, so ChartAgeGroupHeat can reliable pick the correct entry spacing

                const compartmentFilterSusceptibleTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.S_SUSCEPTIBLE));
                const compartmentFilterExposedTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.E_____EXPOSED));
                const compartmentFilterInfectiousTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.I__INFECTIOUS));
                const compartmentFilterRemovedITotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.R___REMOVED_D || c.getCompartmentType() === ECompartmentType.R___REMOVED_U));
                const compartmentFilterRemovedVTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.R___REMOVED_V));
                const compartmentFilterCasesTotal = new CompartmentFilter(c => c.getCompartmentType() === ECompartmentType.X__INCUBATE_0);
                const compartmentFilterIncidenceTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.X__INCUBATE_0 || c.getCompartmentType() === ECompartmentType.X__INCUBATE_N));

                const removedITotal = this.modelState.getNrmValueSum(compartmentFilterRemovedITotal);
                const removedVTotal = this.modelState.getNrmValueSum(compartmentFilterRemovedVTotal);

                const item = {
                    categoryX: TimeUtil.formatCategoryDate(tT),
                    TOTAL_SUSCEPTIBLE: this.modelState.getNrmValueSum(compartmentFilterSusceptibleTotal),
                    TOTAL_EXPOSED: this.modelState.getNrmValueSum(compartmentFilterExposedTotal),
                    TOTAL_INFECTIOUS: this.modelState.getNrmValueSum(compartmentFilterInfectiousTotal),
                    TOTAL_REMOVED_I: removedITotal,
                    TOTAL_REMOVED_V: removedVTotal,
                    TOTAL_CASES: this.modelState.getNrmValueSum(compartmentFilterCasesTotal) * modelSettings.getAbsTotal(),
                    TOTAL_INCIDENCE: this.modelState.getNrmValueSum(compartmentFilterIncidenceTotal) * modelSettings.getAbsTotal() * 100000 / modelSettings.getAbsTotal()
                };

                // chartData.push(this.toDataItem(modelState, tT));
                modelSettings.getAgeGroups().forEach(ageGroup => {

                    const compartmentFilterSusceptible = new CompartmentFilter(c => c.getCompartmentType() === ECompartmentType.S_SUSCEPTIBLE && c.getAgeGroupIndex() === ageGroup.getIndex());
                    const compartmentFilterExposed = new CompartmentFilter(c => c.getCompartmentType() === ECompartmentType.E_____EXPOSED && c.getAgeGroupIndex() === ageGroup.getIndex());
                    const compartmentFilterInfectious = new CompartmentFilter(c => c.getCompartmentType() === ECompartmentType.I__INFECTIOUS && c.getAgeGroupIndex() === ageGroup.getIndex());
                    const compartmentFilterRemovedI = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.R___REMOVED_D || c.getCompartmentType() === ECompartmentType.R___REMOVED_U) && c.getAgeGroupIndex() === ageGroup.getIndex());
                    const compartmentFilterRemovedV = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.R___REMOVED_V && c.getAgeGroupIndex() === ageGroup.getIndex()));
                    const compartmentFilterCases = new CompartmentFilter(c => c.getCompartmentType() === ECompartmentType.X__INCUBATE_0 && c.getAgeGroupIndex() === ageGroup.getIndex());
                    const compartmentFilterIncidence = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.X__INCUBATE_0 || c.getCompartmentType() === ECompartmentType.X__INCUBATE_N) && c.getAgeGroupIndex() === ageGroup.getIndex());

                    const removedI = this.modelState.getNrmValueSum(compartmentFilterRemovedI) * modelSettings.getAbsTotal() / ageGroup.getAbsValue();
                    const removedV = this.modelState.getNrmValueSum(compartmentFilterRemovedV) * modelSettings.getAbsTotal() / ageGroup.getAbsValue();

                    item[ageGroup.getName() + '_SUSCEPTIBLE'] = this.modelState.getNrmValueSum(compartmentFilterSusceptible) * modelSettings.getAbsTotal() / ageGroup.getAbsValue();
                    item[ageGroup.getName() + '_EXPOSED'] = this.modelState.getNrmValueSum(compartmentFilterExposed) * modelSettings.getAbsTotal() / ageGroup.getAbsValue();
                    item[ageGroup.getName() + '_INFECTIOUS'] = this.modelState.getNrmValueSum(compartmentFilterInfectious) * modelSettings.getAbsTotal() / ageGroup.getAbsValue();
                    item[ageGroup.getName() + '_REMOVED_I'] = removedI;
                    item[ageGroup.getName() + '_REMOVED_V'] = removedV;
                    item[ageGroup.getName() + '_CASES'] = this.modelState.getNrmValueSum(compartmentFilterCases) * modelSettings.getAbsTotal();
                    item[ageGroup.getName() + '_INCIDENCE'] = this.modelState.getNrmValueSum(compartmentFilterIncidence) * modelSettings.getAbsTotal() * 100000 / ageGroup.getAbsValue();

                });

                data.push(item);

                progressCallback({
                    ratio: (tT - minInstant) / (maxInstant - minInstant)
                });

            }

        }

        progressCallback({
            ratio: 1,
            data
        });

        return data;

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