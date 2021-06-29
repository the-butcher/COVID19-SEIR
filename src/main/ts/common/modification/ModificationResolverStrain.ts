import { StrainUtil } from './../../util/StrainUtil';
import { ObjectUtil } from './../../util/ObjectUtil';
import { IModificationData } from '../../client/chart/ChartAgeGroup';
import { ChartAgeGroup } from './../../client/chart/ChartAgeGroup';
import { ModelConstants } from './../../model/ModelConstants';
import { TimeUtil } from './../../util/TimeUtil';
import { AModificationResolver } from './AModificationResolver';
import { IModificationValuesStrain } from './IModificationValuesStrain';
import { ModificationStrain } from './ModificationStrain';

/**
 * modification resolver for strain modifications
 *
 * @author h.fleischer
 * @since 25.05.2021
 */
export class ModificationResolverStrain extends AModificationResolver<IModificationValuesStrain, ModificationStrain> {

    constructor() {
        super('STRAIN');
    }

    getMinValue(): number {
        return Math.min(...this.getModificationData().map(d => d.modValueY)) * 0.95;
    }

    getMaxValue(): number {
        return Math.max(...this.getModificationData().map(d => d.modValueY)) * 1.05;
    }

    getTitle(): string {
        return 'reproduction rate';
    }

    getValue(instantA: number): number {

        // const interval = TimeUtil.MILLISECONDS_PER____DAY;

        const instantB = instantA + TimeUtil.MILLISECONDS_PER____DAY * 5;
        const dataItemA = ChartAgeGroup.getInstance().findDataItemByInstant(instantA);
        const dataItemB = ChartAgeGroup.getInstance().findDataItemByInstant(instantB);
        if (dataItemA && dataItemB) {

            // https://en.wikipedia.org/wiki/Basic_reproduction_number;

            const exposedAllStrains = dataItemA.valueset[ModelConstants.AGEGROUP_NAME_______ALL].EXPOSED[ModelConstants.STRAIN_ID___________ALL];
            let rT = 0;

            const modificationsStrain = this.getModifications();
            for (let strainIndex = 0; strainIndex < modificationsStrain.length; strainIndex++) {

                const modificationStrain = modificationsStrain[strainIndex];
                const exposedStrainA = dataItemA.valueset[ModelConstants.AGEGROUP_NAME_______ALL].EXPOSED[modificationStrain.getId()];
                const exposedStrainB = dataItemB.valueset[ModelConstants.AGEGROUP_NAME_______ALL].EXPOSED[modificationStrain.getId()];
                const shareOfStrain = exposedStrainA / exposedAllStrains;

                // const growthRate = (exposedStrainNxt / exposedStrainCur) - 1;
                // rT += Math.pow(Math.E, growthRate * modificationStrain.getSerialInterval()) * shareOfStrain;

                rT += StrainUtil.calculateR0(exposedStrainA, exposedStrainB, instantA, instantB, modificationStrain.getSerialInterval()) * shareOfStrain;

                // console.log(new Date(instant), modificationStrain.getName(), shareOfStrain)

            }

            return rT; // * dataItemCur.valueset[ModelConstants.AGEGROUP_NAME_ALL].SUSCEPTIBLE; // / threshold;

        }

        return Number.NaN;

    }

}