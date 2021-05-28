import { Demographics } from './../../common/demographics/Demographics';
import { IContactMatrix } from './../../common/modification/IContactMatrix';
import { ChartAgeGroup } from '../chart/ChartAgeGroup';
import { ModificationTime } from './../../common/modification/ModificationTime';

export class ContactMatrixEffective implements IContactMatrix {

    private readonly modificationTime: ModificationTime;
    private readonly columnContacts: number[];

    constructor(modificationTime: ModificationTime) {

        this.modificationTime = modificationTime;
        this.columnContacts = [];

        const demographics = Demographics.getInstance();
        const ageGroups = demographics.getAgeGroups();

        let matrixContactCurr = 0;
        let contact: number;
        for (let indexContact = 0; indexContact < ageGroups.length; indexContact++) {
            let columnContactsCurr = 0;
            for (let indexParticipant = 0; indexParticipant < ageGroups.length; indexParticipant++) {
                contact = this.getContacts(indexContact, indexParticipant);
                columnContactsCurr += contact;
                matrixContactCurr += contact;
            }
            this.columnContacts.push(columnContactsCurr);
        }

    }

    getContacts(indexContact: number, indexParticipant: number): number {

        /**
         * reduction through people isolating after a positive test
         */
        const multiplierTesting = this.modificationTime.getTestingMultiplier(indexContact) * this.modificationTime.getTestingMultiplier(indexParticipant);

        /**
         * reduction through susceptibility
         */
        const multiplierSusceptible = ChartAgeGroup.getInstance().getNrmSusceptible(this.modificationTime.getInstantA(), indexContact) * ChartAgeGroup.getInstance().getNrmSusceptible(this.modificationTime.getInstantA(), indexParticipant);

        /**
         * reduction through seasonality
         */
        const multiplierSeasonality = this.modificationTime.getSeasonality();

        // console.log(multiplierTesting, multiplierSusceptible, multiplierSeasonality, multiplierTesting * multiplierSusceptible * multiplierSeasonality);

        return this.modificationTime.getContacts(indexContact, indexParticipant) * multiplierTesting * multiplierSusceptible * multiplierSeasonality;

    }

}