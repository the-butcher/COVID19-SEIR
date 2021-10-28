import { ModificationContact } from '../../../common/modification/ModificationContact';

export interface IModificationSet {
    modA: ModificationContact;
    modB: ModificationContact;
    modC?: ModificationContact;
    ratio?: number;
}