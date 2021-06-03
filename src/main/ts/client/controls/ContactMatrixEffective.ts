import { ContactMatrixSums } from './ContactMatrixSums';
import { ChartAgeGroup } from '../chart/ChartAgeGroup';
import { IContactMatrix } from './../../common/modification/IContactMatrix';
import { ModificationTime } from './../../common/modification/ModificationTime';

export class ContactMatrixEffective implements IContactMatrix {

    private readonly modificationTime: ModificationTime;

    constructor(modificationTime: ModificationTime) {
        this.modificationTime = modificationTime;
    }

    getContacts(indexContact: number, indexParticipant: number): number {
        const multiplierSusceptibleA = ChartAgeGroup.getInstance().getNrmSusceptible(this.modificationTime.getInstantA(), indexContact);
        const multiplierSusceptibleB = ChartAgeGroup.getInstance().getNrmSusceptible(this.modificationTime.getInstantA(), indexParticipant);
        return this.modificationTime.getContacts(indexContact, indexParticipant) * multiplierSusceptibleA * multiplierSusceptibleB;
    }

}