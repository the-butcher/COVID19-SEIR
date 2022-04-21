import { ObjectUtil } from '../../util/ObjectUtil';
import { Demographics } from '../demographics/Demographics';
import { MODIFICATION__FETCH } from './../../model/ModelConstants';
import { TimeUtil } from './../../util/TimeUtil';
import { IVaccinationConfig } from '../demographics/IVaccinationConfig';
import { AModificationResolver } from './AModificationResolver';
import { IModificationValuesVaccination } from './IModificationValuesVaccination';
import { ModificationRegression } from './ModificationRegression';
import { Modifications } from './Modifications';
import { ModificationVaccination } from './ModificationVaccination';

/**
 * modification resolver for vaccination modifications
 *
 * @author h.fleischer
 * @since 25.05.2021
 */
export class ModificationResolverVaccination extends AModificationResolver<IModificationValuesVaccination, ModificationVaccination> {

    constructor() {
        super('VACCINATION');
    }

    createRegressionModification(instantB: number, modificationRegression: ModificationRegression): IModificationValuesVaccination {

        const instantA = instantB - TimeUtil.MILLISECONDS_PER____DAY;

        const vaccinations: { [K: string]: IVaccinationConfig } = {};
        const ageGroups = Demographics.getInstance().getAgeGroups();
        ageGroups.forEach(ageGroup => {

            const v1A = modificationRegression.getVaccinationRegression(instantA, ageGroup.getName(), 'v1').regression;
            const v2A = modificationRegression.getVaccinationRegression(instantA, ageGroup.getName(), 'v2').regression;
            const v3A = modificationRegression.getVaccinationRegression(instantA, ageGroup.getName(), 'v3').regression;
            const v4A = modificationRegression.getVaccinationRegression(instantA, ageGroup.getName(), 'v4').regression;

            const v1B = modificationRegression.getVaccinationRegression(instantB, ageGroup.getName(), 'v1').regression;
            const v2B = modificationRegression.getVaccinationRegression(instantB, ageGroup.getName(), 'v2').regression;
            const v3B = modificationRegression.getVaccinationRegression(instantB, ageGroup.getName(), 'v3').regression;
            const v4B = modificationRegression.getVaccinationRegression(instantB, ageGroup.getName(), 'v4').regression;

            vaccinations[ageGroup.getName()] = {
                v1: v1A,
                v2: v2A,
                v3: v3A,
                v4: v4A,
                d1: v1B - v1A,
                d2: v2B - v2A,
                d3: v3B - v3A,
                d4: v4B - v4A
            }

        });

        const id = ObjectUtil.createId();
        const modificationValues: IModificationValuesVaccination = {
            id,
            key: 'REGRESSION',
            name: `regression (${id})`,
            instant: instantA,
            deletable: true,
            draggable: true,
            vaccinations
        };

        // if (instantB % TimeUtil.MILLISECONDS_PER____DAY === 0) {
        //     console.log('modificationValues', TimeUtil.formatCategoryDateFull(instantB), modificationValues);
        // }

        return modificationValues;

    }

    createInterpolatedInstance(instant: number, modificationA: ModificationVaccination, modificationB: ModificationVaccination): IModificationValuesVaccination {

        const modificationValuesA = modificationA.getModificationValues();
        const modificationValuesB = modificationB.getModificationValues();

        const daysAB = (modificationValuesB.instant - modificationValuesA.instant) / TimeUtil.MILLISECONDS_PER____DAY; // fraction = (instant - modificationValuesA.instant) / (modificationValuesB.instant - modificationValuesA.instant);

        const vaccinations: { [K: string]: IVaccinationConfig } = {};
        const ageGroups = Demographics.getInstance().getAgeGroups();
        ageGroups.forEach(ageGroup => {
            const vaccinationsA = modificationValuesA.vaccinations[ageGroup.getName()];
            const vaccinationsB = modificationValuesB.vaccinations[ageGroup.getName()];
            vaccinations[ageGroup.getName()] = {
                v1: vaccinationsA.v1,
                v2: vaccinationsA.v2,
                v3: vaccinationsA.v3,
                v4: vaccinationsA.v4,
                d1: (vaccinationsB.v1 - vaccinationsA.v1) / daysAB,
                d2: (vaccinationsB.v2 - vaccinationsA.v2) / daysAB,
                d3: (vaccinationsB.v3 - vaccinationsA.v3) / daysAB,
                d4: (vaccinationsB.v4 - vaccinationsA.v4) / daysAB
            }
        });

        const id = ObjectUtil.createId();
        return {
            id,
            key: 'VACCINATION',
            name: `interpolation (${id})`,
            instant,
            deletable: true,
            draggable: true,
            vaccinations
        };

    }

    createCopy(instant: number, modificationA: ModificationVaccination): IModificationValuesVaccination {

        const modificationValuesA = modificationA.getModificationValues();

        const vaccinations: { [K: string]: IVaccinationConfig } = {};
        const ageGroups = Demographics.getInstance().getAgeGroups();
        ageGroups.forEach(ageGroup => {
            const vaccinationsA = modificationValuesA.vaccinations[ageGroup.getName()];
            vaccinations[ageGroup.getName()] = {
                v1: vaccinationsA.v1,
                v2: vaccinationsA.v2,
                v3: vaccinationsA.v3,
                v4: vaccinationsA.v4,
                d1: 0,
                d2: 0,
                d3: 0,
                d4: 0
            }
        });

        const id = ObjectUtil.createId();
        return {
            ...modificationA.getModificationValues(),
            id,
            instant,
            name: `copy (${id})`,
            deletable: true,
            draggable: true,
            vaccinations
        };

    }

    getModification(instant: number, fetchType: MODIFICATION__FETCH): ModificationVaccination {

        const modificationA = super.getModification(instant, fetchType);
        const modificationB = this.typedModifications.find(m => m.appliesToInstant(modificationA.getInstantB() + 1));

        let modificationValues: IModificationValuesVaccination;

        const modificationRegression = Modifications.getInstance().findModificationsByType('REGRESSION').find(m => true) as ModificationRegression;
        if (modificationRegression && instant > modificationRegression.getInstantA()) { // in the prediction range?
            modificationValues = this.createRegressionModification(instant, modificationRegression);
        } else if (modificationA && modificationB && modificationA.getInstantA() < modificationB.getInstantA()) { // fetchType === 'CREATE' &&
            modificationValues = this.createInterpolatedInstance(instant, modificationA, modificationB);
        } else {
            modificationValues = this.createCopy(instant, modificationA);
        }

        const modification = new ModificationVaccination(modificationValues);
        if (fetchType === 'CREATE') {
            modification.setInstants(instant, instant); // will trigger update of 'work' and other mobility based values
            // console.log(fetchType, 'after delegation', modification.getModificationValues());
        }

        return modification;

    }

}