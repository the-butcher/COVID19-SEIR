import { ChartAgeGroup } from '../chart/ChartAgeGroup';
import { Demographics } from '../../common/demographics/Demographics';
import { IContactMatrix } from '../../common/modification/IContactMatrix';
import { ModificationTime } from '../../common/modification/ModificationTime';

export class ContactMatrixExposure implements IContactMatrix {

    private readonly instant: number;
    private readonly contacts: number[][];
    private maxCellTotal: number;
    private maxColTotal: number;

    constructor(instant: number) {

        const demographics = Demographics.getInstance();
        const ageGroups = demographics.getAgeGroups();

        this.instant = instant;

        const dataItem = ChartAgeGroup.getInstance().findDataItem(instant);
        if (dataItem) {
            this.contacts = [];
            this.maxCellTotal = 0;
            this.maxColTotal = 0;
            for (let indexContact = 0; indexContact < ageGroups.length; indexContact++) {
                let colTotal = 0;
                this.contacts[indexContact] = [];
                for (let indexParticipant = 0; indexParticipant < ageGroups.length; indexParticipant++) {
                    this.contacts[indexContact][indexParticipant] = ChartAgeGroup.getInstance().findDataItem(instant).exposure[indexContact][indexParticipant] * demographics.getAbsTotal() / demographics.getAgeGroups()[indexContact].getAbsValue();
                    this.maxCellTotal = Math.max(this.maxCellTotal, this.contacts[indexContact][indexParticipant]);
                    colTotal += this.contacts[indexContact][indexParticipant];
                }
                this.maxColTotal = Math.max(this.maxColTotal, colTotal);
            }
        }

    }

    getInstant(): number {
        return this.instant;
    }

    getMaxCellTotal(): number {
        return this.maxCellTotal; // 0.001;
    }

    getMaxColTotal(): number {
        return this.maxColTotal; // 0.0028;
    }

    getContacts(indexContact: number, indexParticipant: number): number {
        if (this.contacts) {
            return this.contacts[indexContact][indexParticipant];
        }
        return 0;
    }

}