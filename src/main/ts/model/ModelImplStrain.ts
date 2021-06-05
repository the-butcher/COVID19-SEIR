import { Demographics } from '../common/demographics/Demographics';
import { IModificationValuesStrain } from '../common/modification/IModificationValuesStrain';
import { ModificationTesting } from '../common/modification/ModificationTesting';
import { ModificationTime } from '../common/modification/ModificationTime';
import { ECompartmentType } from './compartment/ECompartmentType';
import { ICompartment } from './compartment/ICompartment';
import { IModelSeir } from './IModelSeir';
import { ModelImplIncidence } from './ModelImplIncidence';
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

    /**
     * 1) a one-day compartment of cases that incubated that day
     * 2) 6 more single day compartments to get a total of 7 -> 7-day incidence
     */
    private incidenceModels: ModelImplIncidence[];

    private readonly strainId: string;
    private readonly absTotal: number;
    private readonly nrmValue: number;
    private readonly transmissionRisk: number;

    private readonly nrmDeltas: number[];
    private nrmExposure: number[][];

    constructor(parentModel: ModelImplRoot, demographics: Demographics, strainValues: IModificationValuesStrain, modificationTesting: ModificationTesting) {

        this.parentModel = parentModel;
        this.infectiousModels = [];
        this.incidenceModels = [];
        this.transmissionRisk = strainValues.transmissionRisk;

        this.nrmDeltas = [];

        this.strainId = strainValues.id;
        this.absTotal = demographics.getAbsTotal();

        let nrmValue1 = 0;
        demographics.getAgeGroups().forEach(ageGroup => {

            const groupModel = new ModelImplInfectious(this, demographics, ageGroup, strainValues);
            this.infectiousModels.push(groupModel);
            nrmValue1 += groupModel.getNrmValue();

            this.incidenceModels.push(new ModelImplIncidence(this, demographics, ageGroup, strainValues, modificationTesting));

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

    getIncidenceModel(ageGroupIndex: number): ModelImplIncidence {
        return this.incidenceModels[ageGroupIndex];
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
        this.incidenceModels.forEach(incidenceModel => {
            initialState.add(incidenceModel.getInitialState());
        });
        return initialState;
    }

    isValid(): boolean {
        throw new Error('Method not implemented.');
    }

    getAbsDeltas(): number[] {
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

        let nrmSESums: number[] = [];
        this.infectiousModels.forEach(() => {
            nrmSESums.push(0.0);
        });
        let nrm_ISums: number[] = [];

        this.nrmExposure = [];
        this.infectiousModels.forEach(infectiousModelContact => {

            this.nrmExposure[infectiousModelContact.getAgeGroupIndex()] = [];

            nrmI = 0
            infectiousModelContact.getCompartments().forEach(compartmentI => {
                if (compartmentI.getCompartmentType() === ECompartmentType.I__INFECTIOUS) {
                    nrmI += state.getNrmValue(compartmentI) * compartmentI.getReproductionRatio().getRate(dT);
                }
            });
            nrm_ISums[infectiousModelContact.getAgeGroupIndex()] = nrmI;

            this.infectiousModels.forEach(infectiousModelParticipant => {

                this.nrmExposure[infectiousModelContact.getAgeGroupIndex()][infectiousModelParticipant.getAgeGroupIndex()] = 0;

                const baseContactRate = modificationTime.getContacts(infectiousModelContact.getAgeGroupIndex(), infectiousModelParticipant.getAgeGroupIndex());
                compartmentE = infectiousModelParticipant.getIncomingCompartment();

                this.getRootModel().getCompartmentsSusceptible(infectiousModelParticipant.getAgeGroupIndex()).forEach(compartmentS => {

                    nrmS = state.getNrmValue(compartmentS) * this.absTotal / infectiousModelParticipant.getAgeGroupTotal();
                    nrmE = baseContactRate * nrmI * nrmS * this.transmissionRisk;

                    result.addNrmValue(+nrmE, compartmentE);
                    result.addNrmValue(-nrmE, compartmentS);

                    nrmSESums[infectiousModelParticipant.getAgeGroupIndex()] += nrmE;
                    this.nrmExposure[infectiousModelContact.getAgeGroupIndex()][infectiousModelParticipant.getAgeGroupIndex()] += nrmE;

                });

            });

        });

        this.infectiousModels.forEach(infectiousModelContact => {
            this.nrmDeltas[infectiousModelContact.getAgeGroupIndex()] = nrm_ISums[infectiousModelContact.getAgeGroupIndex()] / nrmSESums[infectiousModelContact.getAgeGroupIndex()];
        });

        /**
         * S->E = S * SUM(I / Tinf)
         * E->I = lat * E
         * I->S = I / Tinf
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

            const compartmentRemovedD = this.parentModel.getCompartmentRemovedD(ageGroupIndex);
            const compartmentRemovedU = this.parentModel.getCompartmentRemovedU(ageGroupIndex);
            // const compartmentSusceptible = this.parentModel.getCompartmentsSusceptible(ageGroupIndex)[0];

            const outgoingCompartment = this.infectiousModels[ageGroupIndex].getOutgoingCompartment();

            const continuationRate = outgoingCompartment.getContinuationRatio().getRate(dT, tT);
            const continuationValue = continuationRate * state.getNrmValue(outgoingCompartment);

            // based upon age-group testing ratios move from infectious to known recovery / unknown recovery
            const ratioD = modificationTime.getTestingRatio(ageGroupIndex);
            const ratioU = 1 - ratioD;

            result.addNrmValue(-continuationValue, outgoingCompartment);
            result.addNrmValue(continuationValue * ratioD, compartmentRemovedD);
            result.addNrmValue(continuationValue * ratioU, compartmentRemovedU);
            // result.addNrmValue(continuationValue, compartmentSusceptible);

        }

        this.incidenceModels.forEach(incidenceModel => {
            result.add(incidenceModel.apply(state, dT, tT, modificationTime));
        });

        return result;

    }

}