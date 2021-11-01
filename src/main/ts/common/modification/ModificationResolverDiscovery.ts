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
            const multipliers: { [K: string]: number} = {};
            mergedKeys.forEach(key => {
                const multiplierA = modificationValuesA.multipliers[key];
                const multiplierB = modificationValuesB.multipliers[key];
                const multiplier = multiplierA + (multiplierB - multiplierA) * fraction;
                multipliers[key] = multiplier;
            });
            const overallA = modificationValuesA.overall;
            const overallB = modificationValuesB.overall;
            const overall = overallA + (overallB - overallA) * fraction;

            const interpolatedModification = new ModificationDiscovery({
                id: ObjectUtil.createId(),
                key: 'TESTING',
                name: 'interpolation',
                instant,
                overall,
                bindToOverall: false,
                deletable: true,
                draggable: true,
                blendable: modificationB.isBlendable(),
                multipliers
            });
            return interpolatedModification;

        } else {
            return modificationA;
        }

    }

    getValue(instant: number): number {

        // const modificationTime = new ModificationTime({
        //     id: ObjectUtil.createId(),
        //     key: 'TIME',
        //     instant: instant,
        //     name: 'discovery value helper',
        //     deletable: false,
        //     draggable: false,
        //     blendable: false
        // });
        // // const modificationTime = Modifications.getInstance().findModificationsByType('TIME')[0] as ModificationTime;
        // modificationTime.setInstants(instant, instant);
        const modificationTime = ModificationTime.createInstance(instant);
        return modificationTime.getDiscoveryRatioTotal();

        // const demographics = Demographics.getInstance();
        // let totalTestingValue = 0;
        // for (let indexContact = 0; indexContact < demographics.getAgeGroups().length; indexContact++) {
        //     const testingVal = this.getModification(instant).getColumnValue(indexContact);
        //     totalTestingValue += testingVal * demographics.getAgeGroups()[indexContact].getAbsValue();
        // }
        // return totalTestingValue / Demographics.getInstance().getAbsTotal();

    }

}