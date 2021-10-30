import { ObjectUtil } from '../../util/ObjectUtil';
import { MODIFICATION__FETCH } from './../../model/ModelConstants';
import { Regression } from './../../model/regression/Regression';
import { Demographics } from './../demographics/Demographics';
import { AModificationResolver } from './AModificationResolver';
import { IModificationValuesContact } from './IModificationValuesContact';
import { ModificationContact } from './ModificationContact';

/**
 * modification resolver for contact modifications
 *
 * @author h.fleischer
 * @since 25.05.2021
 */
export class ModificationResolverContact extends AModificationResolver<IModificationValuesContact, ModificationContact> {

    constructor() {
        super('CONTACT');
    }

    getMinValue(): number {
        return 0;
    }

    getMaxValue(): number {
        return 1;
    }

    getTitle(): string {
        return 'contact rate';
    }

    createRegressionModification(instant: number): ModificationContact {

        const regression = Regression.getInstance(instant);
        const multipliers: { [K in string]: number } = {};
        const corrections: { [K in string]: number } = {};
        Demographics.getInstance().getCategories().forEach(category => {
            multipliers[category.getName()] = regression.getMultiplier(instant, category.getName()).regression;
        });
        Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
            corrections[ageGroup.getName()] = regression.getCorrection(instant, ageGroup.getIndex()).regression;
        });
        // const corrections: { [K in string]: { [K in string]: number }} = {
        //     'family': {..._corrections},
        //     'school': {..._corrections},
        //     'nursing': {..._corrections},
        //     'work': {..._corrections},
        //     'other': {..._corrections},
        // };

        const id = ObjectUtil.createId();
        return new ModificationContact({
            id,
            key: 'CONTACT',
            name: `regression (${id})`,
            instant,
            deletable: true,
            draggable: true,
            multipliers,
            corrections
        });

    }

    interpolateValues(instant: number, modificationA: ModificationContact, modificationB: ModificationContact): IModificationValuesContact {

        const modificationValuesA = modificationA.getModificationValues();
        const modificationValuesB = modificationB.getModificationValues();

        const multipliers: { [K: string]: number} = {};
        const corrections: { [K: string]: number} = {};

        const categoryNames = Demographics.getInstance().getCategories().map(c => c.getName());
        const ageGroups = Demographics.getInstance().getAgeGroups();

        const fraction = (instant - modificationValuesA.instant) / (modificationValuesB.instant - modificationValuesA.instant);

        categoryNames.forEach(categoryName => {

            const multiplierA = modificationValuesA.multipliers[categoryName];
            const multiplierB = modificationValuesB.multipliers[categoryName];
            multipliers[categoryName] = multiplierA + (multiplierB - multiplierA) * fraction;

        });

        ageGroups.forEach(ageGroup => {
            const correctionA = (modificationValuesA.corrections && modificationValuesA.corrections[ageGroup.getName()]) || 1;
            const correctionB = (modificationValuesB.corrections && modificationValuesB.corrections[ageGroup.getName()]) || 1;
            corrections[ageGroup.getName()] = correctionA + (correctionB - correctionA) * fraction;
        });

        return {
            id: ObjectUtil.createId(),
            key: 'CONTACT',
            name: `interpolation (${modificationValuesA.name})`,
            instant,
            deletable: true,
            draggable: true,
            multipliers,
            corrections
        };

    }

    getModification(instant: number, fetchType: MODIFICATION__FETCH): ModificationContact {

        const modificationA = super.getModification(instant, fetchType);
        const modificationB = this.typedModifications.find(m => m.appliesToInstant(modificationA.getInstantB() + 1));

        let modificationValues: IModificationValuesContact;

        // if creating between 2 modification, interpolate
        if (fetchType === 'CREATE' && modificationA && modificationB && modificationA.getInstantA() < modificationB.getInstantA()) {

            modificationValues = this.interpolateValues(instant, modificationA, modificationB);

        } else {

            const id = ObjectUtil.createId();
            modificationValues = {
                ...modificationA.getModificationValues(),
                id,
                name: `interpolation (${id})`,
                deletable: true,
                draggable: true
            };
            // console.log('creating', TimeUtil.formatCategoryDate(instant));

        }

        // if (fetchType === 'CREATE') {
        //     modificationValues.corrections = {}
        // }
        const modification = new ModificationContact(modificationValues);
        if (fetchType === 'CREATE') {
            modification.setInstants(instant, instant); // will trigger update of 'work' and other mobility based values
            console.log(fetchType, 'after delegation', modification.getModificationValues());
        }

        return modification;

    }

    getValue(instant: number): number {
        const modification = this.getModification(instant, 'INTERPOLATE');
        return modification.getMatrixSum() / modification.getMaxMatrixSum();
    }

}