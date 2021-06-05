import { ChartAgeGroup } from '../chart/ChartAgeGroup';
import { Demographics } from '../../common/demographics/Demographics';
import { IContactMatrix } from '../../common/modification/IContactMatrix';
import { ModificationTime } from '../../common/modification/ModificationTime';

export class ContactMatrixExposure implements IContactMatrix {

    private readonly modificationTime: ModificationTime;
    private readonly contacts: number[][];
    private maxCellTotal: number;

    constructor(modificationTime: ModificationTime) {

        this.modificationTime = modificationTime;

        const demographics = Demographics.getInstance();
        const ageGroups = demographics.getAgeGroups();

        this.contacts = [];
        this.maxCellTotal = 0;
        for (let indexContact = 0; indexContact < ageGroups.length; indexContact++) {
            this.contacts[indexContact] = [];
            for (let indexParticipant = 0; indexParticipant < ageGroups.length; indexParticipant++) {
                this.contacts[indexContact][indexParticipant] = ChartAgeGroup.getInstance().findDataItem(this.modificationTime.getInstantA()).exposure[indexContact][indexParticipant] * demographics.getAbsTotal() / demographics.getAgeGroups()[indexContact].getAbsValue();
                this.maxCellTotal = Math.max(this.maxCellTotal, this.contacts[indexContact][indexParticipant]);
            }
        }

    }

    getMaxCellTotal(): number {
        return this.maxCellTotal;
    }

    getContacts(indexContact: number, indexParticipant: number): number {
        return this.contacts[indexContact][indexParticipant];
    }

}