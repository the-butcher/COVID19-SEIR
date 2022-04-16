import { ModificationDiscovery } from '../../common/modification/ModificationDiscovery';
import { IRegressionParams } from './IRegressionParams';
import { ValueRegressionBase } from './ValueRegressionBase';

export interface IRegressionParamsDiscovery extends IRegressionParams<ModificationDiscovery> {
    discoveryPropertyGetter: (m: ModificationDiscovery) => number;
}

export class ValueRegressionDiscovery extends ValueRegressionBase<ModificationDiscovery> {

    private readonly discoveryPropertyGetter: (m: ModificationDiscovery) => number;

    constructor(params: IRegressionParamsDiscovery) {
        super(params);
        this.discoveryPropertyGetter = params.discoveryPropertyGetter;
        this.setup();
    }

    getName(): string {
        return 'discovery';
    }

    toValueY(modificationDiscovery: ModificationDiscovery): number {
        return this.discoveryPropertyGetter(modificationDiscovery);
    }

}