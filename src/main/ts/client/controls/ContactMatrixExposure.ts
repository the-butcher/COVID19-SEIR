import { Demographics } from '../../common/demographics/Demographics';
import { IContactMatrix } from '../../common/modification/IContactMatrix';
import { ChartAgeGroup } from '../chart/ChartAgeGroup';

/**
 * contact matrix showing effective exposure for a given instant
 *
 * @author h.fleischer
 * @since 07.06.2021
 */
export class ContactMatrixExposure implements IContactMatrix {

    private readonly instant: number;
    private readonly contacts: number[][];
    private maxCellTotal: number;
    private maxColTotal: number;

    constructor(instant: number) {

        const demographics = Demographics.getInstance();
        const ageGroups = demographics.getAgeGroups();

        this.instant = instant;

        const dataItem = ChartAgeGroup.getInstance().findDataItemByInstant(instant);
        if (dataItem) {
            this.contacts = [];
            this.maxCellTotal = 0;
            this.maxColTotal = 0;
            for (let indexContact = 0; indexContact < ageGroups.length; indexContact++) {
                let colTotal = 0;
                this.contacts[indexContact] = [];
                for (let indexParticipant = 0; indexParticipant < ageGroups.length; indexParticipant++) {
                    this.contacts[indexContact][indexParticipant] = ChartAgeGroup.getInstance().findDataItemByInstant(instant).exposure[indexContact][indexParticipant] * demographics.getAbsTotal() / demographics.getAgeGroups()[indexContact].getAbsValue();
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

    getValue(indexContact: number, indexParticipant: number): number {
        if (this.contacts) {
            return this.contacts[indexContact][indexParticipant];
        }
        return 0;
    }

    getSummary(indexContact: number, indexParticipant: number): {[K: string]: string} {
        return {
            'exposure': this.contacts[indexContact][indexParticipant].toFixed(4)
        };
    }

}