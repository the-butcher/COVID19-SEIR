import { TimeUtil } from './../../util/TimeUtil';
import { ModelConstants, MODIFICATION____KEY } from '../../model/ModelConstants';
import { ObjectUtil } from '../../util/ObjectUtil';
import { IModificationData } from './../../client/chart/ChartAgeGroup';
import { IModification } from './IModification';
import { IModificationResolver } from './IModificationResolver';
import { IModificationValues } from './IModificationValues';
import { Modifications } from './Modifications';

/**
 * base class of modification resolver, managing modification lookup
 *
 * @author h.fleischer
 * @since 31.05.2021
 */
export abstract class AModificationResolver<V extends IModificationValues, M extends IModification<V>> implements IModificationResolver<V, M> {

    private readonly key: MODIFICATION____KEY;
    private typedModifications: M[];

    constructor(key: MODIFICATION____KEY) {
        this.key = key;
        this.typedModifications = Modifications.getInstance().findModificationsByType(this.key).map(m => m as M);
    }

    getKey(): MODIFICATION____KEY {
        return this.key;
    }

    getModifications(): M[] {
        return this.typedModifications;
    }

    getModificationData(): IModificationData[] {

        const minChartInstant = ModelConstants.MODEL_MIN_____INSTANT;
        const maxChartInstant = ModelConstants.MODEL_MAX_____INSTANT;

        const modificationData = [];
        for (let instant = minChartInstant; instant <= maxChartInstant; instant += TimeUtil.MILLISECONDS_PER____DAY) {
            const modValueY = this.getValue(instant);
            if (!Number.isNaN(modValueY)) {
                modificationData.push({
                    modValueY,
                    categoryX: TimeUtil.formatCategoryDate(instant)
                });
            }
        }

        return modificationData;

    }

    getModification(instant: number): M {
        const applicableModification = this.typedModifications.find(m => m.appliesToInstant(instant));
        if (ObjectUtil.isNotEmpty(applicableModification)) {
            return applicableModification;
        } else if (ObjectUtil.isNotEmpty(ModelConstants.MODIFICATION_PARAMS[this.key].createDefaultModification)) {
            const defaultModification =  ModelConstants.MODIFICATION_PARAMS[this.key].createDefaultModification(ModelConstants.MODEL_MIN_____INSTANT) as M;
            if (this.typedModifications.length > 0) {
                defaultModification.setInstants(ModelConstants.MODEL_MIN_____INSTANT, this.typedModifications[0].getInstantA());
            } else {
                defaultModification.setInstants(ModelConstants.MODEL_MIN_____INSTANT, ModelConstants.MODEL_MAX_____INSTANT);
            }
            return defaultModification;
        } else {
            return null;
        }
    }

    abstract getValue(instant: number): number;

    abstract getMaxValue(): number;

    abstract getMinValue(): number;

    abstract getTitle(): string;

}