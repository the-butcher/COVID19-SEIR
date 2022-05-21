import { ModelInstants } from '../../model/ModelInstants';
import { ValueRegressionDiscovery } from '../../model/regression/ValueRegressionDiscovery';
import { ObjectUtil } from '../../util/ObjectUtil';
import { TimeUtil } from '../../util/TimeUtil';
import { Demographics } from '../demographics/Demographics';
import { MODIFICATION__FETCH } from './../../model/ModelConstants';
import { AModificationResolver } from './AModificationResolver';
import { IModificationValuesDiscovery } from './IModificationValuesDiscovery';
import { ModificationDiscovery } from './ModificationDiscovery';
import { ModificationTime } from './ModificationTime';

/**
 * modification resolver for testing modifications
 *
 * @author h.fleischer
 * @since 25.05.2021
 */
export class ModificationResolverDiscovery extends AModificationResolver<IModificationValuesDiscovery, ModificationDiscovery> {

    private static discoveryRegressions: ValueRegressionDiscovery[];

    constructor() {
        super('TESTING');
    }


    getModification(instant: number, fetchType: MODIFICATION__FETCH): ModificationDiscovery {

        const modificationA = super.getModification(instant, fetchType);
        if (modificationA && modificationA.getInstantA() === instant) {
            return modificationA;
        }

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

            let positivityRate: number;
            if (modificationValuesA.positivityRate && modificationValuesB.positivityRate) {
                const positivityRateA = modificationValuesA.positivityRate;
                const positivityRateB = modificationValuesB.positivityRate;
                positivityRate = positivityRateA + (positivityRateB - positivityRateA) * fraction;
            }

            const interpolatedModification = new ModificationDiscovery({
                id: ObjectUtil.createId(),
                key: 'TESTING',
                name: 'interpolation',
                instant,
                testRate,
                positivityRate,
                deletable: true,
                draggable: true,
                blendable: modificationB.isBlendable(),
                multipliers
            });
            // console.log('interpolatedModification', interpolatedModification);

            return interpolatedModification;

        } else {

            const modificationClone = new ModificationDiscovery({
                ...modificationA.getModificationValues(),
                id: ObjectUtil.createId(),
                instant,
            });
            // console.log('modificationClone', TimeUtil.formatCategoryDateFull(modificationA.getInstantA()), modificationClone);
            return modificationClone;

        }

    }

    static resetRegression(): void {
        // console.warn('resetting pos rate regressions');
        this.discoveryRegressions = undefined;
    }

    static getRegression(ageGroupIndex: number): ValueRegressionDiscovery {

        if (!this.discoveryRegressions) {

            // console.warn('rebuilding pos rate regressions');

            const minInstant = ModelInstants.getInstance().getMinInstant();
            const maxInstant = ModelInstants.getInstance().getMaxInstant();
            const modificationsTime: ModificationTime[] = [];

            // create one every 3 days
            for (let instant = minInstant; instant <= maxInstant; instant += TimeUtil.MILLISECONDS_PER____DAY * 3) {
                const modificationTime = ModificationTime.createInstance(instant);
                modificationsTime.push(modificationTime);
                // console.log('create disc mod', TimeUtil.formatCategoryDateFull(instant), modificationTime);
            }

            this.discoveryRegressions = [];
            Demographics.getInstance().getAgeGroupsWithTotal().forEach(ageGroup => {

                this.discoveryRegressions[ageGroup.getIndex()] = new ValueRegressionDiscovery({
                    discoveryPropertyGetter: (m: ModificationTime) => {
                        return m.getDiscoveryRatesRaw(ageGroup.getIndex()).discovery;
                    },
                    instantA: minInstant,
                    instantB: maxInstant,
                    polyShares: [0.00, 0.50],
                    modifications: modificationsTime
                });

            });


        }
        return this.discoveryRegressions[ageGroupIndex];

    }

}