import { Demographics } from '../common/demographics/Demographics';
import { ModificationTime } from '../common/modification/ModificationTime';
import { IModificationValuesStrain } from '../common/modification/IModificationValuesStrain';
import { IModelSeir } from './IModelSeir';
import { ModelImplInfectious } from './ModelImplInfectious';
import { ModelImplRoot } from './ModelImplRoot';
import { IModelState } from './state/IModelState';
import { ModelState } from './state/ModelState';

export class ModelImplStrain implements IModelSeir {

    private readonly parentModel: ModelImplRoot;
    private readonly infectiousModels: ModelImplInfectious[];
    private readonly absTotal: number;
    private readonly nrmValue: number;
    private readonly exposuresPerContact: number;
    private readonly strain: IModificationValuesStrain;

    constructor(parentModel: ModelImplRoot, demographics: Demographics, strain: IModificationValuesStrain, overallMultiplier: number, incidenceMultipliers: number[]) {

        this.parentModel = parentModel;
        this.infectiousModels = [];
        this.exposuresPerContact = demographics.getExposuresPerContact();

        this.absTotal = demographics.getAbsTotal();

        let nrmValue1 = 0;
        demographics.getAgeGroups().forEach(ageGroup => {
            const groupModel = new ModelImplInfectious(this, demographics, ageGroup, strain, overallMultiplier, incidenceMultipliers[ageGroup.getIndex()]);
            this.infectiousModels.push(groupModel);
            nrmValue1 += groupModel.getNrmValue();
        });
        this.nrmValue = nrmValue1;

        this.strain = strain;

    }

    getRootModel(): ModelImplRoot {
        return this.parentModel;
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

    isValid(): boolean {
        throw new Error('Method not implemented.');
    }

    apply(state: IModelState, dT: number, tT: number, modificationTime: ModificationTime): IModelState {

        const result = ModelState.empty();
        if (tT >= this.strain.instant) {

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
                    const nrmParticipants = absContacts * this.exposuresPerContact / participantInfectiousModel.getAgeGroupTotal();

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
                result.add(infectiousModel.apply(state, dT, tT));
            });

            /**
             * transfer from last infectious compartment to removed (split to discovered and undiscovered)
             */
            for (let i=0; i<this.infectiousModels.length; i++) {

                const compartmentRemovedD = this.parentModel.getCompartmentRemovedD(i);
                const compartmentRemovedU = this.parentModel.getCompartmentRemovedU(i);

                const outgoingCompartment = this.infectiousModels[i].getOutgoingCompartment();
                const ratioD = modificationTime.getTestingRatio(i);
                const ratioU = 1 - ratioD;

                const continuationRate = outgoingCompartment.getContinuationRatio().getRate(dT, tT);
                const continuationValue = continuationRate * state.getNrmValue(outgoingCompartment);

                result.addNrmValue(-continuationValue, outgoingCompartment);
                result.addNrmValue(continuationValue * ratioD, compartmentRemovedD);
                result.addNrmValue(continuationValue * ratioU, compartmentRemovedU);

            }

        }
        return result;

    }

}