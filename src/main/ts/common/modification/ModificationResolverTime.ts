import { Demographics } from './../demographics/Demographics';
import { IModificationData } from '../../client/chart/ChartAgeGroup';
import { ContactMatrixExposure } from '../../client/controls/ContactMatrixExposure';
import { ObjectUtil } from '../../util/ObjectUtil';
import { TimeUtil } from '../../util/TimeUtil';
import { ModelInstants } from './../../model/ModelInstants';
import { AModificationResolver } from './AModificationResolver';
import { IContactMatrix } from './IContactMatrix';
import { IModificationValuesTime } from './IModificationValuesTime';
import { ModificationTime } from './ModificationTime';

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

    private contactMatrices: IContactMatrix[];
    private modificationData: IModificationData[];
    private maxCellValue: number;
    private maxColumnValue: number;

    private constructor() {
        super('TIME');
    }

    getModificationData(): IModificationData[] {
        return this.modificationData;
    }

    buildModificationData(): void {

        const minChartInstant = ModelInstants.getInstance().getMinInstant();
        const maxChartInstant = ModelInstants.getInstance().getMaxInstant();

        this.contactMatrices = [];
        this.modificationData = [];
        for (let instant = minChartInstant; instant <= maxChartInstant; instant += TimeUtil.MILLISECONDS_PER____DAY) {
            this.contactMatrices.push(new ContactMatrixExposure(instant));
        }

        this.maxCellValue = Math.max(...this.contactMatrices.map(m => m.getMaxCellValue()));
        this.maxColumnValue = Math.max(...this.contactMatrices.map(m => m.getMaxColumnValue()));

        this.modificationData = this.contactMatrices.map(m => {
            return {
                modValueY: m.getMatrixSum() * Demographics.getInstance().getAbsTotal(),
                categoryX: TimeUtil.formatCategoryDate(m.getInstant())
            }
        });

    }

    getMaxCellValue(): number {
        return this.maxCellValue;
    }

    getMaxColumnValue(): number {
        return this.maxColumnValue;
    }

    findContactMatrix(instant: number): IContactMatrix {
        return this.contactMatrices.find(m => m.getInstant() === instant);
    }

}