import { Demographics } from '../../common/demographics/Demographics';
import { IModificationValuesDiscovery } from '../../common/modification/IModificationValueDiscovery';
import { IModificationValuesStrain } from '../../common/modification/IModificationValuesStrain';
import { IAnyModificationValue, Modifications } from '../../common/modification/Modifications';
import { ModificationTime } from '../../common/modification/ModificationTime';
import { BaseData } from '../basedata/BaseData';
import { CompartmentFilter } from '../compartment/CompartmentFilter';
import { ECompartmentType } from '../compartment/ECompartmentType';
import { ModelConstants } from '../ModelConstants';
import { ModelImplRoot } from '../ModelImplRoot';
import { ModelInstants } from '../ModelInstants';
import { ModelStateIntegrator } from '../state/ModelStateIntegrator';
import { BaseDataItemCalibrate } from './../basedata/BaseDataItemCalibrate';

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

    static calibrate(demographics: Demographics, modificationValuesStrain: IModificationValuesStrain, modificationValuesTesting: IModificationValuesDiscovery, baseData: BaseData): void {

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
        modificationValuesStrain.transmissionRisk = 0.065; // default start value
        modificationValuesStrain.preIncidences = ageGroups.map(g => modificationValuesStrain.dstIncidence);

        const vv = {};
        vv[preInstant] = 0;
        const vaccinationCurves = {};
        demographics.getAgeGroups().forEach(ageGroup => {
            vaccinationCurves[ageGroup.getName()] = {
                pA: { x: preInstant, y: 0},
                cA: { x: preInstant, y: 0},
                cB: { x: preInstant, y: 0},
                pB: { x: preInstant, y: 0},
                vv: vv
            };
        })

        const modificationValuesCalibrate: IAnyModificationValue[] = [
            {
                id: 'calibrate (seasonality)',
                key: 'SEASONALITY',
                name: 'calibrate (seasonality)',
                instant: new Date('2021-07-10').getTime(),
                seasonality: 1.00,
                deletable: false,
                draggable: false,
                blendable: false
            },
            modificationValuesStrain,
            {
                id: 'calibrate (contact)',
                key: 'CONTACT',
                name: 'calibrate (contact)',
                instant: preInstant,
                multipliers: {
                    // 'school': 0.75,
                    'other': 1 / 2.5
                },
                deletable: false,
                draggable: false,
                blendable: false
            },
            modificationValuesTesting,
            {
                id: 'calibrate (settings)',
                key: 'SETTINGS',
                name: 'calibrate (settings)',
                instant: preInstant,
                undetected: 0.0,
                quarantine: 0.0,
                reexposure: Number.MAX_SAFE_INTEGER,
                dead: 0.0,
                deletable: false,
                draggable: false,
                blendable: false
            },
            {
                id: 'calibrate (time)',
                key: 'TIME',
                name: 'calibrate (time)',
                instant: preInstant,
                deletable: false,
                draggable: false,
                blendable: false
            },
            {
                id: "calibrate (vaccination)",
                key: "VACCINATION",
                name: "calibrate (vaccination)",
                instant: preInstant,
                vaccinationCurves,
                deletable: false,
                draggable: false,
                blendable: false
            }
        ];
        Modifications.setInstanceFromValues(modificationValuesCalibrate);

        const modificationTimeCalibrate = ModelConstants.MODIFICATION_PARAMS['TIME'].createValuesModification({
            id: 'calibrate (time)',
            key: 'TIME',
            name: 'calibrate (time)',
            instant: preInstant,
            deletable: false,
            draggable: false,
            blendable: false
        }) as ModificationTime;
        modificationTimeCalibrate.setInstants(preInstant, preInstant);

        let model: ModelImplRoot = null;
        let modelStateIntegrator: ModelStateIntegrator;

        for (let interpolationIndex = 0; interpolationIndex < 20; interpolationIndex++) {

            // TODO build from demographic since actual age groups are configuration, not fixed
            model = new ModelImplRoot(demographics, Modifications.getInstance(), new BaseDataItemCalibrate(), baseData);
            modelStateIntegrator = new ModelStateIntegrator(model, preInstant);

            const modelState = modelStateIntegrator.getModelState();
            const strainModel = model.findStrainModel(modificationValuesStrain.id);

            // single step on the strain model
            strainModel.apply(modelState, ModelStateIntegrator.DT, preInstant, modificationTimeCalibrate);

            const nrmDeltas = strainModel.getNrmDeltas();
            let nrmDeltaAvg = 0;
            for (let i = 0; i < nrmDeltas.length; i++) {
                modificationValuesStrain.preIncidences[i] *= 1 / nrmDeltas[i]; // this could be a place to calibrate testing-ratio
                nrmDeltaAvg += nrmDeltas[i];
            }
            nrmDeltaAvg /= nrmDeltas.length;

            modificationValuesStrain.transmissionRisk *= nrmDeltaAvg; // with different incidences there are slightly different transmission risks needed to maintain equilibrium

            const compartmentFilterIncidenceTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.X__INCIDENCE_0 || c.getCompartmentType() === ECompartmentType.X__INCIDENCE_N));
            const modelIncidence = modelState.getNrmValueSum(compartmentFilterIncidenceTotal) * demographics.getAbsTotal() * 100000 / demographics.getAbsTotal();

            const incidenceCorrection = modificationValuesStrain.dstIncidence / modelIncidence;
            for (let i = 0; i < modificationValuesStrain.preIncidences.length; i++) {
                modificationValuesStrain.preIncidences[i] *= incidenceCorrection;
            }

            // console.log('strainModel', modificationValuesStrain);

        }

        modificationValuesStrain.r0 = originalR0;

        // console.log('transmissionRisk', modificationValuesStrain.transmissionRisk);

    }

}