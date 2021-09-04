import { Demographics } from './../demographics/Demographics';
import { ObjectUtil } from '../../util/ObjectUtil';
import { TimeUtil } from './../../util/TimeUtil';
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

    getModification(instant: number): ModificationContact {

        const modificationA = super.getModification(instant);
        const modificationB = this.typedModifications.find(m => m.appliesToInstant(modificationA.getInstantB() + 1));

        if (modificationA && modificationB && modificationB.isBlendable() && modificationA.getInstantA() < modificationB.getInstantA()) {

            const modificationValuesA = modificationA.getModificationValues();
            const modificationValuesB = modificationB.getModificationValues();

            const categoryNames = Demographics.getInstance().getCategories().map(c => c.getName());

            const fraction = (instant - modificationValuesA.instant) / (modificationValuesB.instant - modificationValuesA.instant);
            const multipliers: { [K: string]: number} = {};
            const corrections: { [K: string]: { [K: string]: number}} = {};
            const ageGroups = Demographics.getInstance().getAgeGroups();

            categoryNames.forEach(categoryName => {

                corrections[categoryName] = {};

                const multiplierA = modificationValuesA.multipliers[categoryName];
                const multiplierB = modificationValuesB.multipliers[categoryName];
                multipliers[categoryName] = multiplierA + (multiplierB - multiplierA) * fraction;

                ageGroups.forEach(ageGroup => {
                    const correctionA = (modificationValuesA.corrections && modificationValuesA.corrections[categoryName] && modificationValuesA.corrections[categoryName][ageGroup.getName()]) || 1;
                    const correctionB = (modificationValuesB.corrections && modificationValuesB.corrections[categoryName] && modificationValuesB.corrections[categoryName][ageGroup.getName()]) || 1;
                    corrections[categoryName][ageGroup.getName()] = correctionA + (correctionB - correctionA) * fraction;
                });

            });


            const interpolatedModification = new ModificationContact({
                id: ObjectUtil.createId(),
                key: 'CONTACT',
                name: `interpolation (${modificationValuesA.name})`,
                instant,
                deletable: true,
                draggable: true,
                blendable: modificationB.isBlendable(),
                multipliers,
                corrections
            });
            if (instant === modificationValuesA.instant) {
                console.log(interpolatedModification)
            }

            return interpolatedModification;

        } else {
            return modificationA;
        }

    }

    getValue(instant: number): number {
        const modification = this.getModification(instant);
        return modification.getMatrixSum() / modification.getMaxMatrixSum();
    }

}