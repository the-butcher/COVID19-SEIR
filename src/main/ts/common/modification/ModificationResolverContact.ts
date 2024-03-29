import { ObjectUtil } from '../../util/ObjectUtil';
import { MODIFICATION__FETCH } from './../../model/ModelConstants';
import { Demographics } from './../demographics/Demographics';
import { AModificationResolver } from './AModificationResolver';
import { IModificationValuesContact } from './IModificationValuesContact';
import { ModificationContact } from './ModificationContact';
import { ModificationRegression } from './ModificationRegression';
import { Modifications } from './Modifications';

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

    /**
     * create a new instance of modification value from values provided by regression
     * @param instant
     * @returns
     */
    createRegressionInstance(instant: number, modificationRegression: ModificationRegression): IModificationValuesContact {

        const multipliers: { [K in string]: number } = {};
        const corrections: { [K in string]: number } = {};
        Demographics.getInstance().getCategories().forEach(category => {
            multipliers[category.getName()] = modificationRegression.getMultiplierRegression(instant, category.getName()).regression;
        });
        Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
            corrections[ageGroup.getName()] = modificationRegression.getCorrectionRegression(instant, ageGroup.getName()).regression;
        });
        const id = ObjectUtil.createId();
        return {
            id,
            key: 'CONTACT',
            name: `regression (${id})`,
            instant,
            deletable: true,
            draggable: true,
            multipliers,
            corrections
        };

    }

    createInterpolatedInstance(instant: number, modificationA: ModificationContact, modificationB: ModificationContact): IModificationValuesContact {

        const modificationValuesA = modificationA.getModificationValues();
        const modificationValuesB = modificationB.getModificationValues();

        const multipliers: { [K: string]: number } = {};
        const corrections: { [K: string]: number } = {};

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

    createCopy(instant: number, modificationA: ModificationContact): IModificationValuesContact {

        const id = ObjectUtil.createId();
        return {
            ...modificationA.getModificationValues(),
            id,
            instant,
            name: `interpolation (${id})`,
            deletable: true,
            draggable: true
        };

    }

    getModification(instant: number, fetchType: MODIFICATION__FETCH): ModificationContact {

        const modificationA = super.getModification(instant, fetchType);
        const modificationB = this.typedModifications.find(m => m.appliesToInstant(modificationA.getInstantB() + 1));

        let modificationValues: IModificationValuesContact;

        const modificationRegression = Modifications.getInstance().findModificationsByType('REGRESSION').find(m => true) as ModificationRegression;
        if (modificationRegression && instant > modificationRegression.getInstantA()) { // in the prediction range?
            modificationValues = this.createRegressionInstance(instant, modificationRegression);
        } else if (modificationA && modificationB && modificationA.getInstantA() < modificationB.getInstantA()) { // fetchType === 'CREATE' &&
            modificationValues = this.createInterpolatedInstance(instant, modificationA, modificationB);
        } else {
            modificationValues = this.createCopy(instant, modificationA);
        }

        const modification = new ModificationContact(modificationValues);
        if (fetchType === 'CREATE') {
            modification.setInstants(instant, instant); // will trigger update of 'work' and other mobility based values
        }

        return modification;

    }

    getValue(instant: number): number {
        const modification = this.getModification(instant, 'INTERPOLATE');
        return modification.getMatrixSum() / modification.getMaxMatrixSum();
    }

}