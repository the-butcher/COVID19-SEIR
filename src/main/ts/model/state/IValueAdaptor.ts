import { ModificationContact } from '../../common/modification/ModificationContact';
import { IDataItem } from './ModelStateIntegrator';

export interface IValueAdaption {
    prevMultA: number;
    currMultA: number;
    prevMultB: number;
    currMultB: number;
}

export interface IValueAdaptor {

    calculateSetpoint(modificationContactA: ModificationContact, modificationContactB: ModificationContact): number;

    getError(modificationContact: ModificationContact): number;

    adaptValues(modificationContactA: ModificationContact, modificationContactB: ModificationContact, stepDataset: IDataItem[]): IValueAdaption;

}