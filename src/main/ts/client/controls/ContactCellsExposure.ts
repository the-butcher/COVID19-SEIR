import { Demographics } from '../../common/demographics/Demographics';
import { IContactCells } from '../../common/modification/IContactCells';
import { ChartAgeGroup } from '../chart/ChartAgeGroup';

/**
 * contact matrix showing effective exposure for a given instant
 *
 * @author h.fleischer
 * @since 07.06.2021
 */
export class ContactCellsExposure implements IContactCells {

    private readonly instant: number;
    private readonly contacts: number[][];

    constructor(instant: number) {

        const demographics = Demographics.getInstance();
        const ageGroups = demographics.getAgeGroups();

        this.instant = instant;

        const dataItem = ChartAgeGroup.getInstance().findDataItemByInstant(instant);
        if (dataItem) {
            this.contacts = [];
            for (let indexContact = 0; indexContact < ageGroups.length; indexContact++) {
                this.contacts[indexContact] = [];
                for (let indexParticipant = 0; indexParticipant < ageGroups.length; indexParticipant++) {
                    this.contacts[indexContact][indexParticipant] = ChartAgeGroup.getInstance().findDataItemByInstant(instant).exposure[indexContact][indexParticipant] * demographics.getAbsTotal() / demographics.getAgeGroups()[indexContact].getAbsValue();
                }
            }
        }

    }

    getInstant(): number {
        return this.instant;
    }

    getCellValue(indexContact: number, indexParticipant: number): number {
        if (this.contacts) {
            return this.contacts[indexContact][indexParticipant];
        }
        return 0;
    }

}