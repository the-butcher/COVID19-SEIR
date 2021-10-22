import { IPidValues } from './../../common/modification/IModificationValuesContact';
import { ModificationContact } from '../../common/modification/ModificationContact';
import { IDataItem } from './ModelStateIntegrator';

export interface IValueAdaption {
    prevMultA: number;
    currMultA: number;
    prevMultB: number;
    currMultB: number;
}

export interface IValueAdaptor {

    getControlValues(modificationContact: ModificationContact): IPidValues;

    calculateEp(stepDataset: IDataItem[]): number;

    adaptValues(modificationContactA: ModificationContact, modificationContactB: ModificationContact, stepDataset: IDataItem[]): IValueAdaption;

}