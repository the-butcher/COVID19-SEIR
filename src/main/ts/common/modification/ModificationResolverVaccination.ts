import { ObjectUtil } from '../../util/ObjectUtil';
import { Demographics } from '../demographics/Demographics';
import { MODIFICATION__FETCH } from './../../model/ModelConstants';
import { TimeUtil } from './../../util/TimeUtil';
import { IVaccinationConfig2 } from './../demographics/IVaccinationConfig2';
import { AModificationResolver } from './AModificationResolver';
import { IModificationValuesVaccination } from './IModificationValuesVaccination';
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

    createInterpolatedInstance(instant: number, modificationA: ModificationVaccination, modificationB: ModificationVaccination): IModificationValuesVaccination {

        const modificationValuesA = modificationA.getModificationValues();
        const modificationValuesB = modificationB.getModificationValues();
        const daysAB = (modificationValuesB.instant - modificationValuesA.instant) / TimeUtil.MILLISECONDS_PER____DAY; // fraction = (instant - modificationValuesA.instant) / (modificationValuesB.instant - modificationValuesA.instant);

        const vaccinations: { [K: string]: IVaccinationConfig2 } = {};
        const ageGroups = Demographics.getInstance().getAgeGroupsWithTotal();
        ageGroups.forEach(ageGroup => {
            const vaccinationsA = modificationValuesA.vaccinations[ageGroup.getName()];
            const vaccinationsB = modificationValuesB.vaccinations[ageGroup.getName()];
            vaccinations[ageGroup.getName()] = {
                v1: vaccinationsA.v1,
                v2: vaccinationsA.v2,
                v3: vaccinationsA.v3,
                d1: (vaccinationsB.v1 - vaccinationsA.v1) / daysAB,
                d2: (vaccinationsB.v2 - vaccinationsA.v2) / daysAB,
                d3: (vaccinationsB.v3 - vaccinationsA.v3) / daysAB
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

        const vaccinations: { [K: string]: IVaccinationConfig2 } = {};
        const ageGroups = Demographics.getInstance().getAgeGroupsWithTotal();
        ageGroups.forEach(ageGroup => {
            const vaccinationsA = modificationValuesA.vaccinations[ageGroup.getName()];
            vaccinations[ageGroup.getName()] = {
                v1: vaccinationsA.v1,
                v2: vaccinationsA.v2,
                v3: vaccinationsA.v3,
                d1: 0,
                d2: 0,
                d3: 0
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

        // use this to find future values
        // const modificationRegression = Modifications.getInstance().findModificationsByType('VACCINATION').find(m => true) as ModificationRegression;

        // if (modificationRegression && instant > modificationRegression.getInstantA()) { // in the prediction range?

        //     modificationValues = this.createRegressionModification(instant);
        //     // console.log(TimeUtil.formatCategoryDate(instant), modificationValues)

        // } else

        if (modificationA && modificationB && modificationA.getInstantA() < modificationB.getInstantA()) { // fetchType === 'CREATE' &&
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