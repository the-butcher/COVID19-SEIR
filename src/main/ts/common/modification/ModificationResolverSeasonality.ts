import { MODIFICATION__FETCH } from './../../model/ModelConstants';
import { ObjectUtil } from '../../util/ObjectUtil';
import { TimeUtil } from '../../util/TimeUtil';
import { AModificationResolver } from './AModificationResolver';
import { IModificationValuesSeasonality } from './IModificationValuesSeasonality';
import { ModificationSeasonality } from './ModificationSeasonality';
import { Demographics } from '../demographics/Demographics';

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

    /**
     * seasonality modification works somewhat inside out, the value defines the modification rather than modification providing the value
     * @param instant
     * @returns
     */
    getModification(instant: number, fetchType: MODIFICATION__FETCH): ModificationSeasonality {
        const seasonalities = this.getValues(instant);
        const seasonalityValues: IModificationValuesSeasonality = {
            id: ObjectUtil.createId(),
            key: 'SEASONALITY',
            name: 'seasonality',
            instant,
            seasonalities,
            deletable: false,
            draggable: true
        };
        return new ModificationSeasonality(seasonalityValues);
    }

    getValues(instant: number): { [K in string]: number } {
        const modificationSeasonality = this.getModifications()[0] as ModificationSeasonality;
        const seasonalityInstant = modificationSeasonality.getInstantA(); // the instant where amount of seasonality is at it's max
        const values: { [K in string]: number } = {};
        Demographics.getInstance().getCategories().forEach(contactCategory => {
            const cosine = Math.cos((instant - seasonalityInstant) % TimeUtil.MILLISECONDS_PER___YEAR / TimeUtil.MILLISECONDS_PER___YEAR * Math.PI * 2); // 1 at maxSeasonality, -1 at min
            let value = 1 - (cosine + 1) * 0.5 * (1 - modificationSeasonality.getSeasonality(contactCategory.getName())); // 1 at max seasonality, 0 at min
            values[contactCategory.getName()] = value;
        });
        return values;
    }

}