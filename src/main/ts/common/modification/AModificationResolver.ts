import { IModificationData } from './../../client/chart/ChartAgeGroup';
import { Modifications } from './Modifications';
import { ModelConstants, MODIFICATION____KEY } from '../../model/ModelConstants';
import { IModificationResolver } from './IModificationResolver';
import { IModificationValues } from './IModificationValues';
import { IModification } from './IModification';
import { ObjectUtil } from '../../util/ObjectUtil';

export abstract class AModificationResolver<V extends IModificationValues, M extends IModification<V>> implements IModificationResolver<V, M> {

    private readonly key: MODIFICATION____KEY;
    private readonly typedModifications: M[];

    constructor(key: MODIFICATION____KEY) {
        this.key = key;
        this.typedModifications = Modifications.getInstance().findModificationsByType(key).map(m => m as M);
    }

    getKey(): MODIFICATION____KEY {
        return this.key;
    }

    getModifications(): M[] {
        return this.typedModifications;
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

}