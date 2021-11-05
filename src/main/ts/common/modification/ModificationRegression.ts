import { Regression } from '../../model/regression/Regression';
import { TimeUtil } from './../../util/TimeUtil';
import { AModification } from './AModification';
import { IModificationValuesRegression } from './IModificationValuesRegression';
import { ModificationResolverContact } from './ModificationResolverContact';

/**
 * implementation of IModification for a specific instant
 * the matrix-filter provided by this instance is the base for age-group specific modelling
 *
 * @author h.fleischer
 * @since 01.11.2021
 */
export class ModificationRegression extends AModification<IModificationValuesRegression> {

    private regression: Regression;

    constructor(modificationParams: IModificationValuesRegression) {
        super('INSTANT', modificationParams);
    }

    getBackDays(): number {
        return this.modificationValues.back_days;
    }

    getPolyWeight(): number {
        return this.modificationValues.poly_days; // TODO rename property
    }

    getRegression(): Regression {
        return this.regression;
    }

    /**
     * internal regression needs to update when the instant changes
     */
    setInstants(instantA: number, instantB: number): void {
        super.setInstants(instantA, instantB);
        this.updateRegression();
    }

    /**
     * internal regression needs to update when some value changes
     */
    acceptUpdate(update: Partial<IModificationValuesRegression>): void {
        super.acceptUpdate(update);
        this.updateRegression();
    }

    private updateRegression(): void {
        this.regression = new Regression({
            instant: this.getInstantA(),
            instantMods: this.getInstantA() - this.getBackDays() * TimeUtil.MILLISECONDS_PER____DAY,
            polyWeight: this.getPolyWeight(),
            modificationsContact:  new ModificationResolverContact().getModifications()
        });
    }


}