import { ContactMatrixDelegate } from '../../client/controls/ContactMatrixDelegate';
import { IContactMatrix } from './IContactMatrix';
import { IModificationData } from '../../client/chart/ChartAgeGroup';
import { ContactMatrixSums } from '../../client/controls/ContactMatrixSums';
import { ObjectUtil } from '../../util/ObjectUtil';
import { ContactMatrixExposure } from './../../client/controls/ContactMatrixExposure';
import { AModificationResolver } from './AModificationResolver';
import { IModificationValuesTime } from './IModificationValuesTime';
import { ModificationTime } from './ModificationTime';
import { ModelConstants } from '../../model/ModelConstants';
import { TimeUtil } from '../../util/TimeUtil';

/**
 * modification resolver for time modifications
 * no-op
 *
 * @author h.fleischer
 * @since 25.05.2021
 */
export class ModificationResolverTime extends AModificationResolver<IModificationValuesTime, ModificationTime> {

    static getInstance(): ModificationResolverTime {
        if (ObjectUtil.isEmpty(this.instance)) {
            this.instance = new ModificationResolverTime();
        }
        return this.instance;
    }
    private static instance: ModificationResolverTime;

    private contactMatrices: ContactMatrixExposure[];
    private modificationData: IModificationData[];
    private maxCellTotal: number;
    private maxColTotal: number;

    private constructor() {
        super('TIME');
    }

    getModificationData(): IModificationData[] {
        return this.modificationData;
    }

    buildModificationData(): void {

        const minChartInstant = ModelConstants.MODEL_MIN_____INSTANT;
        const maxChartInstant = ModelConstants.MODEL_MAX_____INSTANT;

        this.contactMatrices = [];
        this.modificationData = [];
        for (let instant = minChartInstant; instant <= maxChartInstant; instant += TimeUtil.MILLISECONDS_PER____DAY) {
            this.contactMatrices.push(new ContactMatrixExposure(instant));
        }

        this.maxCellTotal = Math.max(...this.contactMatrices.map(m => m.getMaxCellTotal()));
        this.maxColTotal = Math.max(...this.contactMatrices.map(m => m.getMaxColTotal()));

        this.modificationData = this.contactMatrices.map(m => {
            return {
                modValueY: new ContactMatrixSums(m).getMatrixSum(),
                categoryX: TimeUtil.formatCategoryDate(m.getInstant())
            }
        });

    }

    getMinValue(): number {
        return 0;
    }

    getMaxValue(): number {
        return Math.max(...this.getModificationData().map(d => d.modValueY)) * 1.05;
    }

    getTitle(): string {
        return 'exposure / day';
    }

    findContactMatrix(instant: number): IContactMatrix {
        const contactMatrixExposure = this.contactMatrices.find(m => m.getInstant() === instant);
        return new ContactMatrixDelegate(contactMatrixExposure, this.maxCellTotal, this.maxColTotal);
    }

    getValue(instant: number): number {
        console.warn('NI');
        return Number.NaN;
    }

}