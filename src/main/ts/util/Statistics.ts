export class Statistics {

    private readonly values: number[];
    private isDirty: boolean;

    private average: number;
    private standardDeviation: number;
    private variance: number;

    constructor() {
        this.values = [];
        this.isDirty = true;
    }

    addValue(value: number): void {
        this.values.push(value);
        this.isDirty = true;
    }

    private recalculate(): void {

        this.average = this.values.reduce((prev, curr) => curr + prev, 0) / this.values.length;
        this.variance = this.values.map(v => Math.pow(v - this.average, 2)).reduce((prev, curr) => curr + prev, 0) / this.values.length;
        this.standardDeviation = Math.sqrt(this.variance);

        this.isDirty = false;

    }

    getAverage(): number {
        if (this.isDirty) {
            this.recalculate();
        }
        return this.average;
    }

    getVariance(): number {
        if (this.isDirty) {
            this.recalculate();
        }
        return this.variance;
    }

    getStandardDeviation(): number {
        if (this.isDirty) {
            this.recalculate();
        }
        return this.standardDeviation;
    }

}