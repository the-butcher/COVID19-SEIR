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

    getMinValue(data: IModificationData[]): number {
        return Math.min(...data.map(d => d.modValueY)) * 0.95;
    }

    getMaxValue(data: IModificationData[]): number {
        return Math.max(...data.map(d => d.modValueY)) * 1.05;
    }

    getTitle(): string {
        return 'r(t)';
    }

    getValue(instant: number): number {

        const dataItemCur = ChartAgeGroup.getInstance().findDataItem(instant);
        const dataItemNxt = ChartAgeGroup.getInstance().findDataItem(instant + TimeUtil.MILLISECONDS_PER____DAY);
        if (dataItemCur && dataItemNxt) {

            // https://en.wikipedia.org/wiki/Basic_reproduction_number;

            const exposedAllStrains = dataItemCur.valueset[ModelConstants.AGEGROUP_NAME_ALL].EXPOSED[ModelConstants.STRAIN_ID_____ALL];
            let rT = 0;

            const modificationsStrain = this.getModifications();
            for (let strainIndex = 0; strainIndex < modificationsStrain.length; strainIndex++) {

                const modificationStrain = modificationsStrain[strainIndex];
                const exposedStrainCur = dataItemCur.valueset[ModelConstants.AGEGROUP_NAME_ALL].EXPOSED[modificationStrain.getId()];
                const exposedStrainNxt = dataItemNxt.valueset[ModelConstants.AGEGROUP_NAME_ALL].EXPOSED[modificationStrain.getId()];
                const shareOfStrain = exposedStrainCur / exposedAllStrains;

                const growthRate = (exposedStrainNxt / exposedStrainCur) - 1;
                rT += Math.pow(Math.E, growthRate * modificationStrain.getSerialInterval()) * shareOfStrain;

                // console.log(new Date(instant), modificationStrain.getName(), shareOfStrain)

            }

            return rT; // * dataItemCur.valueset[ModelConstants.AGEGROUP_NAME_ALL].SUSCEPTIBLE; // / threshold;

        }

        return Number.NaN;

    }

}