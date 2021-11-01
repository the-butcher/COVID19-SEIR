import { ModelConstants, MODIFICATION____KEY } from '../../model/ModelConstants';
import { ObjectUtil } from '../../util/ObjectUtil';
import { MODIFICATION__FETCH } from './../../model/ModelConstants';
import { ModelInstants } from './../../model/ModelInstants';
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
    protected typedModifications: M[];

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

    // getModificationData(): IModificationData[] {

    //     const minChartInstant = ModelInstants.getInstance().getMinInstant();
    //     const maxChartInstant = ModelInstants.getInstance().getMaxInstant();

    //     const modificationData = [];
    //     for (let instant = minChartInstant; instant <= maxChartInstant; instant += TimeUtil.MILLISECONDS_PER____DAY) {
    //         const modValueY = this.getValue(instant);
    //         if (!Number.isNaN(modValueY)) {
    //             modificationData.push({
    //                 modValueY,
    //                 categoryX: TimeUtil.formatCategoryDate(instant)
    //             });
    //         }
    //     }

    //     return modificationData;

    // }

    getModification(instant: number, fetchType: MODIFICATION__FETCH): M {

        const minChartInstant = ModelInstants.getInstance().getMinInstant();
        const maxChartInstant = ModelInstants.getInstance().getMaxInstant();

        const applicableModification = this.typedModifications.find(m => m.appliesToInstant(instant));
        if (ObjectUtil.isNotEmpty(applicableModification)) {
            return applicableModification;
        } else if (ObjectUtil.isNotEmpty(ModelConstants.MODIFICATION_PARAMS[this.key].createDefaultModification)) {
            const defaultModification =  ModelConstants.MODIFICATION_PARAMS[this.key].createDefaultModification(minChartInstant) as M;
            if (this.typedModifications.length > 0) {
                defaultModification.setInstants(minChartInstant, this.typedModifications[0].getInstantA());
            } else {
                defaultModification.setInstants(minChartInstant, maxChartInstant);
            }
            return defaultModification;
        } else {
            return null;
        }
    }

}