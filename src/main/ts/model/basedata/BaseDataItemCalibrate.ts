import { IBaseDataItemConfig } from './BaseData';
import { IBaseDataItem } from './BaseDataItem';
export class BaseDataItemCalibrate implements IBaseDataItem {
    getIcuM7(): number {
        throw new Error('Method not implemented.');
    }
    getHospitalization(): number {
        throw new Error('Method not implemented.');
    }
    getIcu(): number {
        throw new Error('Method not implemented.');
    }
    getAverageTests(): number {
        throw new Error('Method not implemented.');
    }

    calculateAverageValues(): void {
        // do nothing
    }

    calculatePrimaryValues(): void {
        // do nothing
    }

    getMobilityOther(): number {
        return 0;
    }

    getMobilityWork(): number {
        return 0;
    }

    getMobilityHome(): number {
        return 0;
    }

    getCasesM6(ageGroupIndex: number): number {
        return 0;
    }

    getCasesM7(ageGroupIndex: number): number {
        return 0;
    }

    getAverageHelp1(ageGroupIndex: number): number {
        return 0;
    }

    getAverageHelp2(ageGroupIndex: number): number {
        return 0;
    }

    getAverageMobilityOther(): number {
        return 0;
    }

    getAverageMobilityWork(): number {
        return 0;
    }

    getAverageMobilityHome(): number {
        return 0;
    }

    extrapolateBaseDataItemConfig(): IBaseDataItemConfig {
        return undefined;
    }

    getDerivedPositivity(): number {
        return 0;
    }

    getReproduction(ageGroupIndex: number): number {
        return 0;
    }

    getInstant(): number {
        return -1;
    }

    getIncidence(ageGroupIndex: number): number {
        return 0;
    }

    getTestsM7(): number {
        return 0;
    }

    getCasesM1(ageGroupIndex: number): number {
        return 0;
    }

    getAverageCases(ageGroupIndex: number): number {
        return 0;
    }

    getExposed(ageGroupName: string): number {
        return 0;
    }

    getRemoved(ageGroupName: string): number {
        return 0;
    }

    getVacc1(ageGroupName: string): number {
        return 0;
    }

    getVacc2(ageGroupName: string): number {
        return 0;
    }

    getVacc3(ageGroupName: string): number {
        return 0;
    }

    getTests(): number {
        return 0;
    }

    getAveragePositivity() {
        return 0;
    }

}