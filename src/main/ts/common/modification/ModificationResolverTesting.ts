import { IModificationData } from '../../client/chart/ChartAgeGroup';
import { ObjectUtil } from '../../util/ObjectUtil';
import { Demographics } from '../demographics/Demographics';
import { AModificationResolver } from './AModificationResolver';
import { IModificationValuesTesting } from './IModificationValuesTesting';
import { ModificationTesting } from './ModificationTesting';

/**
 * modification resolver for testing modifications
 *
 * @author h.fleischer
 * @since 25.05.2021
 */
export class ModificationResolverTesting extends AModificationResolver<IModificationValuesTesting, ModificationTesting> {

    constructor() {
        super('TESTING');
    }

    getMinValue(): number {
        return 0;
    }

    getMaxValue(): number {
        return 1;
    }

    getTitle(): string {
        return 'discovery rate';
    }

    getValue(instant: number): number {
        const demographics = Demographics.getInstance();
        let totalTestingValue = 0;
        for (let indexContact = 0; indexContact < demographics.getAgeGroups().length; indexContact++) {
            const testingVal = this.getModification(instant).getValue(indexContact);
            totalTestingValue += testingVal * demographics.getAgeGroups()[indexContact].getAbsValue();
        }
        return totalTestingValue / Demographics.getInstance().getAbsTotal();
    }

}