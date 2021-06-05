import { IModificationData } from '../../client/chart/ChartAgeGroup';
import { ContactMatrixSums } from '../../client/controls/ContactMatrixSums';
import { ChartAgeGroup } from './../../client/chart/ChartAgeGroup';
import { ModelConstants } from './../../model/ModelConstants';
import { Demographics } from './../demographics/Demographics';
import { AModificationResolver } from './AModificationResolver';
import { IModificationValuesStrain } from './IModificationValuesStrain';
import { ModificationResolverContact } from './ModificationResolverContact';
import { ModificationResolverSeasonality } from './ModificationResolverSeasonality';
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

    getMaxValue(data: IModificationData[]): number {
        return Math.max(...data.map(d => d.modValueY)) * 1.01;
    }

    getValue(instant: number): number {

        const modificationContact = new ModificationResolverContact().getModification(instant);
        const modificationSeasonality = new ModificationResolverSeasonality().getModification(instant);

        const matrixRatio = new ContactMatrixSums(modificationContact).getMatrixSum() * modificationSeasonality.getSeasonality() / Demographics.getInstance().getMatrixSum();

        const modificationsStrain = this.getModifications();
        const dataItem = ChartAgeGroup.getInstance().findDataItem(instant);
        if (dataItem) {

            const exposedTotal = dataItem.valueset[ModelConstants.AGEGROUP_NAME_ALL].EXPOSED[ModelConstants.STRAIN_ID_____ALL];
            let r0 = 0;

            // collect exposure by strain-id
            modificationsStrain.forEach(modificationStrain => {

                const exposedStrain = dataItem.valueset[ModelConstants.AGEGROUP_NAME_ALL].EXPOSED[modificationStrain.getId()];
                const exposedRatio = exposedStrain / exposedTotal;
                r0 += modificationStrain.getR0() * exposedRatio;

            });

            const rT = r0 * dataItem.valueset[ModelConstants.AGEGROUP_NAME_ALL].SUSCEPTIBLE * matrixRatio;

            console.log('r0', new Date(instant), r0, rT);

            return rT;

        }

        return 0;

    }

}