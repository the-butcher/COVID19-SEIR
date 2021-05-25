import { TimeUtil } from '../../util/TimeUtil';
import { AModificationResolver } from './AModificationResolver';
import { IModificationValuesSeasonality } from './IModificationValuesSeasonality';
import { ModificationSeasonality } from './ModificationSeasonality';

/**
 * modification resolver for seasonality modifications
 *
 * @author h.fleischer
 * @since 25.05.2021
 */
export class ModificationResolverSeasonality extends AModificationResolver<IModificationValuesSeasonality, ModificationSeasonality> {

    constructor() {
        super('SEASONALITY');
    }

    getMaxValue(): number {
        return 1;
    }

    getValue(instant: number): number {
        const modificationSeasonality = this.getModifications()[0] as ModificationSeasonality;
        const seasonalityInstant = modificationSeasonality.getInstantA(); // the instant where amount of seasonality is at it's max
        const cosine = Math.cos((instant - seasonalityInstant) % TimeUtil.MILLISECONDS_PER___YEAR / TimeUtil.MILLISECONDS_PER___YEAR * Math.PI * 2); // 1 at maxSeasonality, -1 at min
        let value = 1 - (cosine + 1) * 0.5 * (1 - modificationSeasonality.getAmount()); // 1 at max seasonality, 0 at min
        return value;
    }

}