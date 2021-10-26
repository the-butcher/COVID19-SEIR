import { TimeUtil } from './../../util/TimeUtil';
import { BaseData } from './../../model/basedata/BaseData';
import { MODIFICATION__FETCH } from './../../model/ModelConstants';
import { ObjectUtil } from '../../util/ObjectUtil';
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

    getModification(instant: number, fetchType: MODIFICATION__FETCH): ModificationContact {

        const modificationA = super.getModification(instant, fetchType);
        const modificationB = this.typedModifications.find(m => m.appliesToInstant(modificationA.getInstantB() + 1));

        let modificationValues: IModificationValuesContact;
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

            modificationValues = {
                id: ObjectUtil.createId(),
                key: 'CONTACT',
                name: `interpolation (${modificationValuesA.name})`,
                instant,
                deletable: true,
                draggable: true,
                blendable: modificationB.isBlendable(),
                multipliers,
                corrections
            };

        } else {

            const id = ObjectUtil.createId();
            modificationValues = {
                ...modificationA.getModificationValues(),
                id,
                name: `interpolation (${id})`,
                deletable: true,
                draggable: true,
                blendable: true
            };
            // console.log('creating with', modificationValues);

        }

        // if (fetchType === 'CREATE') {
        //     modificationValues.corrections = {}
        // }
        const modification = new ModificationContact(modificationValues);
        if (fetchType === 'CREATE') {
            modification.setInstants(instant, instant); // will trigger update of 'work' multiplier
        }

        return new ModificationContact(modificationValues);

    }

    getValue(instant: number): number {
        const modification = this.getModification(instant, 'INTERPOLATE');
        return modification.getMatrixSum() / modification.getMaxMatrixSum();
    }

}