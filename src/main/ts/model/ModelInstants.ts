import { TimeUtil } from './../util/TimeUtil';
import { ModelConstants } from './ModelConstants';

export class ModelInstants {

    static setInstanceFromValues(ticks: number[]): void {
        this.instance = new ModelInstants(ticks);
    }
    static getInstance(): ModelInstants {
        return this.instance;
    }
    private static instance: ModelInstants;

    private readonly ticks: number[];
    private readonly minInstant: number;
    private readonly maxInstant: number;

    constructor(ticks: number[]) {
        this.ticks = ticks;
        this.minInstant = Math.min(...ticks);
        this.maxInstant = Math.max(...ticks);
        // console.log('instants', TimeUtil.formatCategoryDate(this.minInstant), TimeUtil.formatCategoryDate(this.maxInstant));
    }

    getPreInstant(): number {
        return this.minInstant - TimeUtil.MILLISECONDS_PER____DAY * ModelConstants.PRELOAD_________________DAYS;
    }

    getMinInstant(): number {
        return this.minInstant;
    }

    getMaxInstant(): number {
        return this.maxInstant;
    }

    getTicks(): number[] {
        return this.ticks;
    }

}