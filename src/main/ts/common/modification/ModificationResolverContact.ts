import { Demographics } from '../demographics/Demographics';
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

    getMaxValue(): number {
        return 1;
    }

    getValue(instant: number): number {
        const demographics = Demographics.getInstance();
        const matrixContactTotal = demographics.getMatrixSum();
        let matrixContactCurr = 0;
        for (let indexX = 0; indexX < demographics.getAgeGroups().length; indexX++) {
            for (let indexY = 0; indexY < demographics.getAgeGroups().length; indexY++) {
                matrixContactCurr += this.getModification(instant).getContacts(indexX, indexY); // TODO premultiply with population to give a more meaningful value;
            }
        }
        return matrixContactCurr / matrixContactTotal;
    }

}