import { IModificationData } from '../../client/chart/ChartAgeGroup';
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

    getMaxValue(data: IModificationData[]): number {
        return 8;
    }

    getValue(instant: number): number {
        // const modificationTime = ModelConstants.MODIFICATION_PARAMS['TIME'].createValuesModification({
        //   id: 'straintime',
        //   instant,
        //   key: 'TIME',
        //   name: 'straintime',
        //   deletable: true,
        //   draggable: true
        // }) as ModificationTime;
        // modificationTime.setInstants(instant, instant);
        // const contactMatrixEffective = new ContactMatrixEffective(modificationTime);
        // const contactMatrixSums = new ContactMatrixSums(contactMatrixEffective);
        // return contactMatrixSums.getMatrixSum() / Demographics.getInstance().getMatrixSum();
        // // TODO r must either be calculated during integration or infectious must be split to strains, so at this point strain shares can be determined
        // this.getModifications().forEach(modificationStrain => {
        //     const r0 = modificationStrain.getModificationValues().r0;
        // });
        return 0;
    }

    // getNrmStrain(instant: number, strainId: string): number {
    //     if (ObjectUtil.isNotEmpty(this.modelData)) {
    //         let categoryX = TimeUtil.formatCategoryDate(instant);
    //         const dataItem = this.modelData.find(d => d.categoryX === categoryX);
    //         if (dataItem) {
    //             return dataItem.valueset[ModelConstants.AGEGROUP_NAME_ALL].INFECTIOUS
    //         };
    //     }
    //     return -1;
    // }

}