import { IModificationValuesStrain } from '../common/modification/IModificationValuesStrain';
import { IAnyModificationValue, Modifications } from '../common/modification/Modifications';
import { ModificationTime } from '../common/modification/ModificationTime';
import { Demographics } from './../common/demographics/Demographics';
import { CompartmentFilter } from './compartment/CompartmentFilter';
import { ECompartmentType } from './compartment/ECompartmentType';
import { ModelConstants } from './ModelConstants';
import { ModelImplRoot } from './ModelImplRoot';
import { ModelStateIntegrator } from './state/ModelStateIntegrator';
export class StrainCalibrator {

    constructor() {

    }

    calibrate(demographics: Demographics, modificationValuesStrain: IModificationValuesStrain): void {

        const ageGroups = demographics.getAgeGroups();

        /**
         * start at minus preload days
         */
        const curInstant = ModelConstants.MODEL_MIN_____INSTANT; // - TimeUtil.MILLISECONDS_PER____DAY * ModelConstants.PRELOAD_________________DAYS;

        /**
         * start with some default
         */
        const originalR0 = modificationValuesStrain.r0;

        modificationValuesStrain.r0 = 1;
        modificationValuesStrain.transmissionRisk = 0.065;
        modificationValuesStrain.modifiers = ageGroups.map(g => modificationValuesStrain.incidence);

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
                instant: ModelConstants.MODEL_MIN_____INSTANT,
                multipliers: {},
                deletable: false,
                draggable: false
            },
            {
                id: 'calibrate (testing)',
                key: 'TESTING',
                name: 'calibrate (testing)',
                instant: ModelConstants.MODEL_MIN_____INSTANT,
                multipliers: {
                    'family': 1.00,
                    'school': 1.00,
                    'nursing': 1.00,
                    'work': 1.00,
                    'other': 1.00
                },
                deletable: false,
                draggable: false
            },
            {
                id: 'calibrate (settings)',
                key: 'SETTINGS',
                name: 'calibrate (settings)',
                instant: ModelConstants.MODEL_MIN_____INSTANT,
                recoveredD: 0.0,
                recoveredU: 0.0,
                quarantine: 0.0,
                dead: 0.0,
                vaccinated: 0.0,
                deletable: false,
                draggable: false
            },
            {
                id: 'calibrate (time)',
                key: 'TIME',
                name: 'calibrate (time)',
                instant: curInstant,
                deletable: false,
                draggable: false
            }
        ];
        Modifications.setInstanceFromValues(modificationValuesCalibrate);

        const modificationTimeCalibrate = ModelConstants.MODIFICATION_PARAMS['TIME'].createValuesModification({
            id: 'calibrate (time)',
            key: 'TIME',
            name: 'calibrate (time)',
            instant: curInstant,
            deletable: false,
            draggable: false
        }) as ModificationTime;
        modificationTimeCalibrate.setInstants(curInstant, curInstant);

        let model: ModelImplRoot = null;
        let modelStateIntegrator: ModelStateIntegrator;

        for (let interpolationIndex = 0; interpolationIndex < 20; interpolationIndex++) {

            model = new ModelImplRoot(demographics, Modifications.getInstance());
            modelStateIntegrator = new ModelStateIntegrator(model, curInstant);

            const modelState = modelStateIntegrator.getModelState();
            const strainModel = model.findStrainModel(modificationValuesStrain.id);

            // single step on the strain model
            strainModel.apply(modelState, ModelStateIntegrator.DT, ModelConstants.MODEL_MIN_____INSTANT, modificationTimeCalibrate);

            const absDeltas = strainModel.getAbsDeltas();
            let absDeltaAvg = 0;
            for (let i = 0; i < absDeltas.length; i++) {
                modificationValuesStrain.modifiers[i] /= absDeltas[i];
                absDeltaAvg += absDeltas[i];
            }
            absDeltaAvg /= absDeltas.length;

            modificationValuesStrain.transmissionRisk *= absDeltaAvg;

            const compartmentFilterIncidenceTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.X__INCUBATE_0 || c.getCompartmentType() === ECompartmentType.X__INCUBATE_N));
            const modelIncidence = modelState.getNrmValueSum(compartmentFilterIncidenceTotal) * demographics.getAbsTotal() * 100000 / demographics.getAbsTotal();

            const incidenceCorrection = modificationValuesStrain.incidence / modelIncidence;
            for (let i = 0; i < modificationValuesStrain.modifiers.length; i++) {
                modificationValuesStrain.modifiers[i] *= incidenceCorrection;
            }

            // modificationStrain.acceptUpdate({
            //     incidence,
            //     modifiers,
            //     transmissionRisk
            // });

            // console.log('strainModel', strainModel, strainModel.getAbsDeltas(), modifiers, incidenceCorrection, incidence, transmissionRisk);

        }
        modificationValuesStrain.r0 = originalR0;

        console.log('modificationValuesStrain', modificationValuesStrain);

    }

}