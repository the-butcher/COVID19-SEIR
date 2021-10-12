import { StrainUtil } from '../../util/StrainUtil';
import { AgeGroup } from './../../common/demographics/AgeGroup';
import { ModificationContact } from './../../common/modification/ModificationContact';
import { IDataItem } from './ModelStateIntegrator';

export interface IContactCorrection {
    casesRatioB: number;
    prevMultA: number;
    currMultA: number;
}

export class ContactAdapter {

    private readonly modificationContactA: ModificationContact;

    constructor(modificationContactA: ModificationContact, modificationContactB: ModificationContact) {
        this.modificationContactA = modificationContactA;
    }

    calculateMultiplier(contactCategory: string, ageGroup: AgeGroup, dataItemA: IDataItem, dataItemB: IDataItem): IContactCorrection {

        const casesB = StrainUtil.findCases(dataItemB, ageGroup);
        const casesRatioB = casesB.data / casesB.base;

        const prevMultA = this.modificationContactA.getCategoryValue(contactCategory);
        const currMultA = Math.max(0, Math.min(1, prevMultA - Math.log10(casesRatioB) / 25));

        return {
            casesRatioB,
            prevMultA,
            currMultA
        };

    }

    calculateCorrection(ageGroup: AgeGroup, dataItemA: IDataItem, dataItemB: IDataItem): IContactCorrection {

        const casesB = StrainUtil.findCases(dataItemB, ageGroup);
        const casesRatioB = casesB.data / casesB.base;

        const prevMultA = this.modificationContactA.getCorrectionValue('other', ageGroup.getIndex())
        const currMultA = Math.max(0, Math.min(prevMultA - Math.log10(casesRatioB) / 25));

        return {
            casesRatioB,
            prevMultA,
            currMultA
        };

    }

}