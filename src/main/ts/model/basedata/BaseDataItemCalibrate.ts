import { IBaseDataItem } from './BaseDataItem';
export class BaseDataItemCalibrate implements IBaseDataItem {

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

    getTests(): number {
        return 0;
    }

    getPositivityRate() {
        return 0;
    }

}