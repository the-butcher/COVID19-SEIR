import { Demographics } from '../../common/demographics/Demographics';
import { IModificationValuesStrain } from '../../common/modification/IModificationValuesStrain';
import { IModificationValuesTesting } from '../../common/modification/IModificationValuesTesting';
import { IAnyModificationValue, Modifications } from '../../common/modification/Modifications';
import { ModificationTime } from '../../common/modification/ModificationTime';
import { CompartmentFilter } from '../compartment/CompartmentFilter';
import { ECompartmentType } from '../compartment/ECompartmentType';
import { ModelConstants } from '../ModelConstants';
import { ModelImplRoot } from '../ModelImplRoot';
import { ModelInstants } from '../ModelInstants';
import { ModelStateIntegrator } from '../state/ModelStateIntegrator';
import { BaseData } from './BaseData';

/**
 * utility type that takes care of calibrating a strain with respect to current age groups and testing (discovery) rates
 * to be in equilibrium in a hypothetical endemic state (SEIS model) at r0=1
 *
 * @author h.fleischer
 * @since 04.06.2021
 *
 */
export class StrainCalibrator {

    private constructor() {
        // no public instance
    }

    static calibrate(demographics: Demographics, modificationValuesStrain: IModificationValuesStrain, modificationValuesTesting: IModificationValuesTesting, baseData: BaseData): void {

        const ageGroups = demographics.getAgeGroups();

        /**
         * start at minus preload days
         */
        const preInstant = ModelInstants.getInstance().getPreInstant();

        /**
         * start with some default
         */
        const originalR0 = modificationValuesStrain.r0;

        modificationValuesStrain.r0 = 1;
        modificationValuesStrain.transmissionRisk = 0.065;
        modificationValuesStrain.preIncidences = ageGroups.map(g => modificationValuesStrain.dstIncidence);

        const modificationValuesCalibrate: IAnyModificationValue[] = [
            {
                id: 'calibrate (seasonality)',
                key: 'SEASONALITY',
                name: 'calibrate (seasonality)',
                instant: new Date('2021-07-10').getTime(),
                seasonality: 1.00,
                deletable: false,
                draggable: false
            },
            modificationValuesStrain,
            {
                id: 'calibrate (contact)',
                key: 'CONTACT',
                name: 'calibrate (contact)',
                instant: preInstant,
                multipliers: {},
                deletable: false,
                draggable: false
            },
            modificationValuesTesting,
            {
                id: 'calibrate (settings)',
                key: 'SETTINGS',
                name: 'calibrate (settings)',
                instant: preInstant,
                undetected: 0.0,
                quarantine: 0.0,
                dead: 0.0,
                deletable: false,
                draggable: false
            },
            {
                id: 'calibrate (time)',
                key: 'TIME',
                name: 'calibrate (time)',
                instant: preInstant,
                deletable: false,
                draggable: false
            }
        ];
        Modifications.setInstanceFromValues(modificationValuesCalibrate);

        const modificationTimeCalibrate = ModelConstants.MODIFICATION_PARAMS['TIME'].createValuesModification({
            id: 'calibrate (time)',
            key: 'TIME',
            name: 'calibrate (time)',
            instant: preInstant,
            deletable: false,
            draggable: false
        }) as ModificationTime;
        modificationTimeCalibrate.setInstants(preInstant, preInstant);

        let model: ModelImplRoot = null;
        let modelStateIntegrator: ModelStateIntegrator;

        for (let interpolationIndex = 0; interpolationIndex < 20; interpolationIndex++) {

            model = new ModelImplRoot(demographics, Modifications.getInstance(), {
                "<= 04": [0, 0, 0],
                "05-14": [0, 0, 0],
                "15-24": [0, 0, 0],
                "25-34": [0, 0, 0],
                "35-44": [0, 0, 0],
                "45-54": [0, 0, 0],
                "55-64": [0, 0, 0],
                "65-74": [0, 0, 0],
                "75-84": [0, 0, 0],
                ">= 85": [0, 0, 0],
                "TOTAL": [0, 0, 0]
            }, baseData);
            modelStateIntegrator = new ModelStateIntegrator(model, preInstant);

            const modelState = modelStateIntegrator.getModelState();
            const strainModel = model.findStrainModel(modificationValuesStrain.id);

            // single step on the strain model
            strainModel.apply(modelState, ModelStateIntegrator.DT, preInstant, modificationTimeCalibrate);

            const absDeltas = strainModel.getAbsDeltas();
            let absDeltaAvg = 0;
            for (let i = 0; i < absDeltas.length; i++) {
                modificationValuesStrain.preIncidences[i] *= 1 / absDeltas[i]; // this could be a place to calibrate testing-ratio
                absDeltaAvg += absDeltas[i];
            }
            absDeltaAvg /= absDeltas.length;

            modificationValuesStrain.transmissionRisk *= absDeltaAvg; // with different incidences there are slightly different transmission risks needed to maintain equilibrium

            const compartmentFilterIncidenceTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.X__INCUBATE_0 || c.getCompartmentType() === ECompartmentType.X__INCUBATE_N));
            const modelIncidence = modelState.getNrmValueSum(compartmentFilterIncidenceTotal) * demographics.getAbsTotal() * 100000 / demographics.getAbsTotal();

            const incidenceCorrection = modificationValuesStrain.dstIncidence / modelIncidence;
            for (let i = 0; i < modificationValuesStrain.preIncidences.length; i++) {
                modificationValuesStrain.preIncidences[i] *= incidenceCorrection;
            }

            // console.log('strainModel', modificationValuesStrain);

        }

        modificationValuesStrain.r0 = originalR0;

        // console.log('strain incidences', modificationValuesStrain.name, modificationValuesStrain.incidences);

    }

}