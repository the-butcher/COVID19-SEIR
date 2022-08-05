import { Demographics } from '../common/demographics/Demographics';
import { IModificationValuesStrain } from '../common/modification/IModificationValuesStrain';
import { ModificationTime } from '../common/modification/ModificationTime';
import { IBaseDataItem } from './basedata/BaseDataItem';
import { ECompartmentType } from './compartment/ECompartmentType';
import { ICompartment } from './compartment/ICompartment';
import { IModelSeir } from './IModelSeir';
import { ModelConstants } from './ModelConstants';
import { ModelImplInfectious } from './ModelImplInfectious';
import { ModelImplRecovery } from './ModelImplRecovery';
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

    /**
     * one infectious model / age
     */
    private readonly infectiousModels: ModelImplInfectious[];
    private readonly recoveryModels: ModelImplRecovery[];

    private readonly strainValues: IModificationValuesStrain;
    private readonly absTotal: number;
    private readonly nrmValue: number;
    private readonly transmissionRisk: number;
    private readonly immuneEscape: number;
    private readonly strainEscape: { [K in string]: number };

    private readonly nrmDeltas: number[];
    private nrmExposure: number[][];

    constructor(parentModel: ModelImplRoot, demographics: Demographics, strainValues: IModificationValuesStrain, modificationTime: ModificationTime, referenceDataRemoved: IBaseDataItem) {

        this.parentModel = parentModel;
        this.infectiousModels = [];
        this.recoveryModels = [];
        this.transmissionRisk = strainValues.transmissionRisk;
        this.immuneEscape = strainValues.immuneEscape;
        this.strainEscape = { ...strainValues.strainEscape };

        this.nrmDeltas = [];

        this.strainValues = strainValues;
        this.absTotal = demographics.getAbsTotal();

        let initialUndetected: number[] = [
            3.00, // <= 04
            0.90, // 05-14
            1.20, // 15-24
            1.30, // 25-34
            1.30, // 35-44
            1.30, // 45-54
            1.30, // 55-64
            1.20, // 65-74
            1.10, // 75-84
            1.00  // >= 85
        ];

        let nrmValue1 = 0;
        demographics.getAgeGroups().forEach(ageGroup => {

            const grpRatio = 1 - ageGroup.getIndex() * 0.075; // 0.55 for oldest (longer ago), 1 for youngest (were vaccinated more recently)
            let absValueRecoveredD = strainValues.primary ? referenceDataRemoved.getRemoved(ageGroup.getName()) * (1 + initialUndetected[ageGroup.getIndex()]) : 0;
            absValueRecoveredD = absValueRecoveredD * grpRatio;

            const infectiousModel = new ModelImplInfectious(this, demographics, ageGroup, strainValues, modificationTime);
            this.infectiousModels.push(infectiousModel);
            nrmValue1 += infectiousModel.getNrmValue();

            const recoveryModel = new ModelImplRecovery(this, demographics.getAbsTotal(), absValueRecoveredD, ageGroup, strainValues);
            this.recoveryModels.push(recoveryModel);
            nrmValue1 += recoveryModel.getNrmValue();

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
        return this.strainValues.id;
    }

    getInfectiousModel(ageGroupIndex: number): ModelImplInfectious {
        return this.infectiousModels[ageGroupIndex];
    }

    getRecoveryModel(ageGroupIndex: number): ModelImplRecovery {
        return this.recoveryModels[ageGroupIndex];
    }

    getNrmValueGroup(ageGroupIndex: number): number {
        return this.infectiousModels[ageGroupIndex].getNrmValue() + this.recoveryModels[ageGroupIndex].getNrmValue();
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
        this.infectiousModels.forEach(infectiousModel => {
            initialState.add(infectiousModel.getInitialState());
        });
        this.recoveryModels.forEach(recoveryModel => {
            initialState.add(recoveryModel.getInitialState());
        });
        return initialState;
    }

    getNrmDeltas(): number[] {
        return this.nrmDeltas;
    }

    getNrmExposure(): number[][] {
        return this.nrmExposure;
    }

    getStepCases(ageGroupIndex: number): number {
        return this.infectiousModels[ageGroupIndex].getStepCases();
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
        let immuneEscape: number;

        this.nrmExposure = [];
        this.infectiousModels.forEach(infectiousModelContact => {

            this.nrmExposure[infectiousModelContact.getAgeGroupIndex()] = [];

            // calculate a normalized value of infectious individuals
            nrmI = 0
            infectiousModelContact.getCompartments().forEach(compartmentI => {
                if (compartmentI.getCompartmentType() === ECompartmentType.I___INFECTIOUS) {
                    nrmI += state.getNrmValue(compartmentI) * compartmentI.getReproductionRatio().getRate(dT);
                }
            });
            nrm_ISums[infectiousModelContact.getAgeGroupIndex()] = nrmI;

            this.infectiousModels.forEach(infectiousModelParticipant => {

                this.nrmExposure[infectiousModelContact.getAgeGroupIndex()][infectiousModelParticipant.getAgeGroupIndex()] = 0;

                // contact rate and exposed compartment
                const baseContactRate = modificationTime.getCellValue(infectiousModelContact.getAgeGroupIndex(), infectiousModelParticipant.getAgeGroupIndex());

                nrmESum = 0;
                this.getRootModel().getCompartmentsSusceptible(infectiousModelParticipant.getAgeGroupIndex(), this.strainValues).forEach(compartmentS => {

                    immuneEscape = compartmentS.getStrainId() === ModelConstants.STRAIN_ID___________ALL ? this.immuneEscape : this.strainEscape[compartmentS.getStrainId()];
                    // console.log('immuneEscape', immuneEscape, this.strainEscape, compartmentS.getStrainId());

                    // if there is some immunity, can be treated as immune (escape only), if there is no immunity (immunizing, susceptible), treat as fully susceptible
                    susceptibility = compartmentS.getImmunity() > 0 ? immuneEscape : 1;

                    nrmS = state.getNrmValue(compartmentS) * this.absTotal / infectiousModelParticipant.getAgeGroupTotal();
                    nrmE = baseContactRate * nrmI * nrmS * this.transmissionRisk * susceptibility;

                    // remove from susceptible compartment (adding to exposed happens after loop in a single call)
                    result.addNrmValue(-nrmE, compartmentS);
                    nrmESum += nrmE;

                    nrmSESums[infectiousModelParticipant.getAgeGroupIndex()] += nrmE;
                    this.nrmExposure[infectiousModelContact.getAgeGroupIndex()][infectiousModelParticipant.getAgeGroupIndex()] += nrmE;

                });

                // batch exposure from various contacts with other age groups
                /**
                 * TODO differentiate between vaccinated and non-vaccinated here
                 */
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
         * recovery internal transfer through compartment chain
         */
        this.recoveryModels.forEach(recoveryModel => {
            result.add(recoveryModel.apply(state, dT, tT, modificationTime));
        });



        return result;

    }

}