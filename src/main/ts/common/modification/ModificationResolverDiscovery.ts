import { ObjectUtil } from '../../util/ObjectUtil';
import { MODIFICATION__FETCH } from './../../model/ModelConstants';
import { AModificationResolver } from './AModificationResolver';
import { IModificationValuesDiscovery } from './IModificationValueDiscovery';
import { ModificationDiscovery } from './ModificationDiscovery';
import { ModificationTime } from './ModificationTime';

/**
 * modification resolver for testing modifications
 *
 * @author h.fleischer
 * @since 25.05.2021
 */
export class ModificationResolverDiscovery extends AModificationResolver<IModificationValuesDiscovery, ModificationDiscovery> {

    constructor() {
        super('TESTING');
    }


    getModification(instant: number, fetchType: MODIFICATION__FETCH): ModificationDiscovery {

        const modificationA = super.getModification(instant, fetchType);
        const modificationB = this.typedModifications.find(m => m.appliesToInstant(modificationA.getInstantB() + 1)) as ModificationDiscovery;

        if (modificationA && modificationB && modificationA.getInstantA() < modificationB.getInstantA()) {

            const modificationValuesA = modificationA.getModificationValues();
            const modificationValuesB = modificationB.getModificationValues();

            const mergedKeys: Set<string> = new Set();
            Object.keys(modificationValuesA.multipliers).forEach(key => {
                mergedKeys.add(key);
            });
            Object.keys(modificationValuesB.multipliers).forEach(key => {
                mergedKeys.add(key);
            });

            const fraction = (instant - modificationValuesA.instant) / (modificationValuesB.instant - modificationValuesA.instant);
            const multipliers: { [K: string]: number } = {};
            mergedKeys.forEach(key => {
                const multiplierA = modificationValuesA.multipliers[key];
                const multiplierB = modificationValuesB.multipliers[key];
                const multiplier = multiplierA + (multiplierB - multiplierA) * fraction;
                multipliers[key] = multiplier;
            });

            const testRateA = modificationValuesA.testRate;
            const testRateB = modificationValuesB.testRate;
            const testRate = testRateA + (testRateB - testRateA) * fraction;

            const interpolatedModification = new ModificationDiscovery({
                id: ObjectUtil.createId(),
                key: 'TESTING',
                name: 'interpolation',
                instant,
                testRate,
                deletable: true,
                draggable: true,
                blendable: modificationB.isBlendable(),
                multipliers
            });
            // console.log('interpolatedModification', interpolatedModification);

            return interpolatedModification;

        } else {
            // return new ModificationDiscovery({
            //     instant,
            //     ...modificationA.getModificationValues()
            // });
            return modificationA;
        }

    }

    getValue(instant: number): number {
        const modificationTime = ModificationTime.createInstance(instant);
        return modificationTime.getDiscoveryRateTotal();
    }

}