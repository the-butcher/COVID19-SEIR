import { Demographics } from '../common/demographics/Demographics';
import { IModificationValuesStrain } from '../common/modification/IModificationValuesStrain';
import { ModificationTesting } from '../common/modification/ModificationTesting';
import { ModificationTime } from '../common/modification/ModificationTime';
import { IModelSeir } from './IModelSeir';
import { ModelImplIncidence } from './ModelImplIncidence';
import { ModelImplInfectious } from './ModelImplInfectious';
import { ModelImplRoot } from './ModelImplRoot';
import { IModelState } from './state/IModelState';
import { ModelState } from './state/ModelState';

export class ModelImplStrain implements IModelSeir {

    private readonly parentModel: ModelImplRoot;

    private readonly infectiousModels: ModelImplInfectious[];

    /**
     * 1) a one-day compartment of cases that incubated that day
     * 2) 6 more single day compartments to get a total of 7 -> 7-day incidence
     */
    private incidenceModels: ModelImplIncidence[];

    private readonly absTotal: number;
    private readonly nrmValue: number;
    private readonly exposuresPerContact: number;
    // private readonly strainValues: IModificationValuesStrain;

    constructor(parentModel: ModelImplRoot, demographics: Demographics, strainValues: IModificationValuesStrain, modificationTesting: ModificationTesting) {

        this.parentModel = parentModel;
        this.infectiousModels = [];
        this.incidenceModels = [];
        this.exposuresPerContact = demographics.getExposuresPerContact();

        this.absTotal = demographics.getAbsTotal();

        let nrmValue1 = 0;
        demographics.getAgeGroups().forEach(ageGroup => {

            const testingRatio = modificationTesting.getTestingRatio(ageGroup.getIndex());
            const groupModel = new ModelImplInfectious(this, demographics, ageGroup, strainValues);
            this.infectiousModels.push(groupModel);
            nrmValue1 += groupModel.getNrmValue();

            this.incidenceModels.push(new ModelImplIncidence(this, demographics, ageGroup, strainValues, testingRatio));

        });
        this.nrmValue = nrmValue1;

    }

    getRootModel(): ModelImplRoot {
        return this.parentModel;
    }

    getIncidenceModel(ageGroupIndex: number): ModelImplIncidence {
        return this.incidenceModels[ageGroupIndex];
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

    apply(state: IModelState, dT: number, tT: number, modificationTime: ModificationTime): IModelState {

        const result = ModelState.empty();

        // if (tT % TimeUtil.MILLISECONDS_PER____DAY === 0) {
        //     console.log('seasonality', new Date(tT), modificationTime.getSeasonality());
        // }

        const absExposedParticipants: number[] = [];
        this.infectiousModels.forEach(participantInfectiousModel => {
            absExposedParticipants[participantInfectiousModel.getAgeGroupIndex()] = 0;
        });

        this.infectiousModels.forEach(contactInfectiousModel => {

            // an absolute number of infectious individuals in the contact group (premultiplied to match dT, r0 and )
            const absInfectious = contactInfectiousModel.getAbsInfectious(state, dT);
            // console.log('absInfectiousContacts', contactInfectiousModel.getAgeGroupIndex(), absInfectiousContacts);

            this.infectiousModels.forEach(participantInfectiousModel => {

                const absContacts = modificationTime.getContacts(contactInfectiousModel.getAgeGroupIndex(), participantInfectiousModel.getAgeGroupIndex()) * absInfectious;
                const nrmParticipants = modificationTime.getSeasonality() * absContacts * this.exposuresPerContact / participantInfectiousModel.getAgeGroupTotal();

                const compartmentsSusceptible = this.getRootModel().getCompartmentsSusceptible(participantInfectiousModel.getAgeGroupIndex());
                let nrmExposureTotal = 0;
                compartmentsSusceptible.forEach(compartmentSusceptible => {

                    const nrmExposure = nrmParticipants * state.getNrmValue(compartmentSusceptible);
                    nrmExposureTotal += nrmExposure;
                    result.addNrmValue(-nrmExposure, compartmentSusceptible);

                });
                result.addNrmValue(nrmExposureTotal, participantInfectiousModel.getIncomingCompartment());

            });

        });

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

            const outgoingCompartment = this.infectiousModels[ageGroupIndex].getOutgoingCompartment();
            const ratioD = modificationTime.getTestingRatio(ageGroupIndex);
            const ratioU = 1 - ratioD;

            const continuationRate = outgoingCompartment.getContinuationRatio().getRate(dT, tT);
            const continuationValue = continuationRate * state.getNrmValue(outgoingCompartment);

            result.addNrmValue(-continuationValue, outgoingCompartment);
            result.addNrmValue(continuationValue * ratioD, compartmentRemovedD);
            result.addNrmValue(continuationValue * ratioU, compartmentRemovedU);

        }

        this.incidenceModels.forEach(incidenceModel => {
            result.add(incidenceModel.apply(state, dT, tT, modificationTime));
        });

        return result;

    }

}