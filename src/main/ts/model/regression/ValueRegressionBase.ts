import { TimeUtil } from './../../util/TimeUtil';
import regression, { DataPoint } from 'regression';
import { ModelInstants } from '../ModelInstants';
import { ModificationContact } from './../../common/modification/ModificationContact';
import { IRegressionParams, IRegressionResult } from './Regression';

export abstract class ValueRegressionBase {

    private readonly instant: number;
    private readonly instantMods: number;
    private readonly polyWeight: number;
    private readonly equationParamsLin: number[];
    private readonly equationParamsPol: number[];
    private readonly originalValues: { [K in string]: number };
    private readonly modificationsContact: ModificationContact[];

    constructor(params: IRegressionParams) {

        this.instant = params.instant;
        this.instantMods = params.instantMods;
        this.polyWeight = params.polyWeight;
        this.equationParamsLin = [];
        this.equationParamsPol = [];
        this.originalValues = {};
        this.modificationsContact = params.modificationsContact;

    }

    protected setup(): void {

        // look into each category
        const regressionData: DataPoint[] = [];

        // reduce to modifications that are relevant for our instance
        const relevantModifications = this.modificationsContact.filter(m => m.getInstantA() >= this.instantMods && m.getInstantA() <= this.instant);
        relevantModifications.forEach(relevantModification => {
            regressionData.push([
                this.toRegressionX(relevantModification.getInstant()),
                this.toValueY(relevantModification)
            ]);

        });

        /**
         * raw data, should contain all modifications
         */
        this.modificationsContact.forEach(modificationContact => {
            this.originalValues[modificationContact.getInstant()] = this.toValueY(modificationContact);
        });

        const regressionResultPol = regression.polynomial(regressionData, { order: 3 });
        const regressionResultLin = regression.linear(regressionData);

        // console.log('reg', regressionResultPol, regressionResultLin)

        this.equationParamsPol.push(...regressionResultPol.equation);
        this.equationParamsLin.push(...regressionResultLin.equation);

    }


    getRegressionResult(instant: number): IRegressionResult {

        // put instant into regressions space
        const regressionX = this.toRegressionX(instant);
        const regressionPol = Math.pow(regressionX, 3) * this.equationParamsPol[0] + Math.pow(regressionX, 2) * this.equationParamsPol[1] + regressionX * this.equationParamsPol[2] + this.equationParamsPol[3];
        const regressionLin = regressionX * this.equationParamsLin[0] + this.equationParamsLin[1];

        // // (cos(x)+1)/2 1@0, 0@pi
        // const daysOff = Math.abs(instant - this.instant) / TimeUtil.MILLISECONDS_PER____DAY;
        // const daysRel = 14;
        // let ratioPol = 0;
        // if (daysOff <= daysRel) {
        //     const daysRad = daysOff / daysRel * Math.PI;
        //     ratioPol = (Math.cos(daysRad) + 1) / 2;
        // }

        const ratioPol = this.polyWeight;
        const ratioLin = 1 - ratioPol;

        const regression = regressionPol * ratioPol + regressionLin * ratioLin;
        return {
            regression,
            original: this.originalValues[instant] // will be undefined in many cases
        };

    }

    /**
     * let the subclass provide an appropriate value
     * @param modificationContact
     */
    abstract toValueY(modificationContact: ModificationContact): number;

    /**
     * transform instant into a manageable value space in the range 0-1
     * @param instant
     * @returns
     */
    toRegressionX(instant: number): number {
        return (instant - ModelInstants.getInstance().getMinInstant()) / (ModelInstants.getInstance().getMaxInstant() - ModelInstants.getInstance().getMinInstant());
    };

}