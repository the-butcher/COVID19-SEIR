import { ModificationTime } from "../../common/modification/ModificationTime";
import { IRegressionParams } from "./IRegressionParams";
import { ValueRegressionBase } from "./ValueRegressionBase";

export interface IRegressionParamsDiscovery extends IRegressionParams<ModificationTime> {
    discoveryPropertyGetter: (m: ModificationTime) => number;
}

export class ValueRegressionDiscovery extends ValueRegressionBase<ModificationTime> {

    private readonly discoveryPropertyGetter: (m: ModificationTime) => number;

    constructor(params: IRegressionParamsDiscovery) {
        super(params);
        this.discoveryPropertyGetter = params.discoveryPropertyGetter;
        this.setup();
    }

    getName(): string {
        return 'discovery';
    }

    toValueY(modificationTime: ModificationTime): number {
        return this.discoveryPropertyGetter(modificationTime);
    }

}