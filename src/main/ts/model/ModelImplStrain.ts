import { Demographics } from '../common/demographics/Demographics';
import { IModificationValuesStrain } from '../common/modification/IModificationValuesStrain';
import { ModificationTime } from '../common/modification/ModificationTime';
import { BaseData } from './basedata/BaseData';
import { ECompartmentType } from './compartment/ECompartmentType';
import { ICompartment } from './compartment/ICompartment';
import { IModelSeir } from './IModelSeir';
import { ModelImplInfectious } from './ModelImplInfectious';
import { ModelImplRoot } from './ModelImplRoot';
import { IModelState } from './state/IModelState';
import { ModelState } from './state/ModelState';

/**
 * submodel specific to a single strain
 * handles the cross age-group infection modelling
 *
 * @author h.fleischer
 * @since 04.06.2021
 */
export class ModelImplStrain implements IModelSeir {

    private readonly parentModel: ModelImplRoot;

    private readonly infectiousModels: ModelImplInfectious[];

    private readonly strainId: string;
    private readonly absTotal: number;
    private readonly nrmValue: number;
    private readonly transmissionRisk: number;
    private readonly immuneEscape: number;

    private readonly nrmDeltas: number[];
    private nrmExposure: number[][];

    constructor(parentModel: ModelImplRoot, demographics: Demographics, strainValues: IModificationValuesStrain, modificationTime: ModificationTime, baseData: BaseData) {

        this.parentModel = parentModel;
        this.infectiousModels = [];
        this.transmissionRisk = strainValues.transmissionRisk;
        this.immuneEscape = strainValues.immuneEscape;

        this.nrmDeltas = [];

        this.strainId = strainValues.id;
        this.absTotal = demographics.getAbsTotal();

        let nrmValue1 = 0;
        demographics.getAgeGroups().forEach(ageGroup => {
            const groupModel = new ModelImplInfectious(this, demographics, ageGroup, strainValues, modificationTime);
            this.infectiousModels.push(groupModel);
            nrmValue1 += groupModel.getNrmValue();
        });

        // pre-fill norm exposure
        this.nrmExposure = [];
        this.infectiousModels.forEach(infectiousModelContact => {
            this.nrmExposure[infectiousModelContact.getAgeGroupIndex()] = [];
            this.infectiousModels.forEach(infectiousModelParticipant => {
                this.nrmExposure[infectiousModelContact.getAgeGroupIndex()][infectiousModelParticipant.getAgeGroupIndex()] = 0.0;
            });
        });

        this.nrmValue = nrmValue1;

    }

    getRootModel(): ModelImplRoot {
        return this.parentModel;
    }

    getStrainId(): string {
        return this.strainId;
    }

    getInfectiousModel(ageGroupIndex: number): ModelImplInfectious {
        return this.infectiousModels[ageGroupIndex];
    }

    getNrmValueGroup(ageGroupIndex: number): number {
        return this.infectiousModels[ageGroupIndex].getNrmValue();
    }

    getAbsTotal(): number {
        return this.absTotal;
    }
    getNrmValue(): number {
        return this.nrmValue;
    }
    getAbsValue(): number {
        return this.nrmValue * this.absTotal;
    }

    getInitialState(): IModelState {
        const initialState = ModelState.empty();
        this.infectiousModels.forEach(groupModel => {
            initialState.add(groupModel.getInitialState());
        });
        return initialState;
    }

    getNrmDeltas(): number[] {
        return this.nrmDeltas;
    }

    getNrmExposure(): number[][] {
        return this.nrmExposure;
    }

    apply(state: IModelState, dT: number, tT: number, modificationTime: ModificationTime): IModelState {

        const result = ModelState.empty();

        /**
         * calculate infectious contacts between groups
         */
        let nrmI: number;
        let nrmS: number;
        let nrmE: number;
        let compartmentE: ICompartment;
        let nrmESum: number;

        let nrmSESums: number[] = [];
        this.infectiousModels.forEach(() => {
            nrmSESums.push(0.0);
        });
        let nrm_ISums: number[] = [];

        let susceptibility: number;

        this.nrmExposure = [];
        this.infectiousModels.forEach(infectiousModelContact => {

            this.nrmExposure[infectiousModelContact.getAgeGroupIndex()] = [];

            // calculate a normalized value of infectious individuals
            nrmI = 0
            infectiousModelContact.getCompartments().forEach(compartmentI => {
                if (compartmentI.getCompartmentType() === ECompartmentType.I_INFECTIOUS_A) {
                    nrmI += state.getNrmValue(compartmentI) * compartmentI.getReproductionRatio().getRate(dT);
                }
            });
            nrm_ISums[infectiousModelContact.getAgeGroupIndex()] = nrmI;

            this.infectiousModels.forEach(infectiousModelParticipant => {

                this.nrmExposure[infectiousModelContact.getAgeGroupIndex()][infectiousModelParticipant.getAgeGroupIndex()] = 0;

                // contact rate and exposed compartment
                const baseContactRate = modificationTime.getCellValue(infectiousModelContact.getAgeGroupIndex(), infectiousModelParticipant.getAgeGroupIndex());

                nrmESum = 0;
                this.getRootModel().getCompartmentsSusceptible(infectiousModelParticipant.getAgeGroupIndex()).forEach(compartmentS => {

                    susceptibility = (compartmentS.getCompartmentType() == ECompartmentType.S__SUSCEPTIBLE || compartmentS.getCompartmentType() == ECompartmentType.R___REMOVED_VI) ? 1 : this.immuneEscape;

                    nrmS = state.getNrmValue(compartmentS) * this.absTotal / infectiousModelParticipant.getAgeGroupTotal();
                    nrmE = baseContactRate * nrmI * nrmS * this.transmissionRisk * susceptibility;

                    // remove from susceptible compartment (adding to exposed happens after loop in a single call)
                    result.addNrmValue(-nrmE, compartmentS);

                    nrmESum += nrmE;
                    nrmSESums[infectiousModelParticipant.getAgeGroupIndex()] += nrmE;
                    this.nrmExposure[infectiousModelContact.getAgeGroupIndex()][infectiousModelParticipant.getAgeGroupIndex()] += nrmE;

                });
                compartmentE = infectiousModelParticipant.getFirstCompartment();
                result.addNrmValue(nrmESum, compartmentE);

            });

        });

        // calculate a ratio between infections and exposure to be used by calibration
        this.infectiousModels.forEach(infectiousModelContact => {
            this.nrmDeltas[infectiousModelContact.getAgeGroupIndex()] = nrm_ISums[infectiousModelContact.getAgeGroupIndex()] / nrmSESums[infectiousModelContact.getAgeGroupIndex()];
        });

        /**
         * S->E = S * SUM(I / Tinfectious)
         * E->I = latency * E
         * I->S = I / Tinfectious
         */
        // console.log('absSESums', absSESums, 'abs_ISums', abs_ISums, 'absDeltas', absDeltas);

        /**
         * infectious internal transfer through compartment chain
         */
        this.infectiousModels.forEach(infectiousModel => {
            result.add(infectiousModel.apply(state, dT, tT, modificationTime));
        });

        /**
         * transfer from last infectious compartment to removed (split to discovered and undiscovered)
         */
        for (let ageGroupIndex = 0; ageGroupIndex < this.infectiousModels.length; ageGroupIndex++) {

            const compartmentRemovedD = this.parentModel.getCompartmentRemoved(ageGroupIndex);
            // const compartmentRemovedU = this.parentModel.getCompartmentRemovedU(ageGroupIndex);
            // ~~~CALIBRATION
            // const compartmentSusceptible = this.parentModel.getCompartmentsSusceptible(ageGroupIndex)[0];

            const outgoingCompartment = this.infectiousModels[ageGroupIndex].getLastCompartment();

            const continuationRate = outgoingCompartment.getContinuationRatio().getRate(dT, tT);
            const continuationValue = continuationRate * state.getNrmValue(outgoingCompartment);

            // based upon age-group testing ratios move from infectious to known recovery / unknown recovery
            // const ratioD = modificationTime.getDiscoveryRatios(ageGroupIndex).discovery;
            // const ratioU = 1 - ratioD;

            // removal from last infectious happens in infectious model (TODO find a more readable version)
            result.addNrmValue(continuationValue, compartmentRemovedD);
            // result.addNrmValue(continuationValue * ratioD, compartmentRemovedD);
            // result.addNrmValue(continuationValue * ratioU, compartmentRemovedU);
            // ~~~CALIBRATION
            // result.addNrmValue(continuationValue, compartmentSusceptible);

        }

        return result;

    }

}