// @ts-ignore
import { Bezier } from 'bezier-js';
import { BaseData } from '../../model/calibration/BaseData';
import { ModelConstants } from '../../model/ModelConstants';
import { ModelInstants } from '../../model/ModelInstants';
import { ModelStateIntegrator } from '../../model/state/ModelStateIntegrator';
import { ICoordinate } from '../../util/ICoordinate';
import { IVaccinationConfig } from '../demographics/IVaccinationConfig';
import { TimeUtil } from './../../util/TimeUtil';
import { Demographics } from './../demographics/Demographics';
import { AModification } from './AModification';
import { IModificationValuesVaccination } from './IModificationValuesVaccination';

/**
 * implementation of IModification to hold configurable value for the vaccination model
 *
 * @author h.fleischer
 * @since 23.04.2021
 */
export class ModificationVaccination extends AModification<IModificationValuesVaccination> {

    private readonly luts1: { [K in string]: { [K in number]: number}};
    private readonly luts2: { [K in string]: { [K in number]: number}};

    constructor(modificationParams: IModificationValuesVaccination) {
        super('INSTANT', modificationParams);
        this.luts1 = {};
        this.luts2 = {};
        // when called in the constructor, it will later be passed to the worker in a complete state, otherwise the worker will create default objects that are never known in main
        Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
            this.getVaccinationConfig(ageGroup.getName());
        });
    }

    getLut1ByName(ageGroup: string): { [K in number]: number } {
        if (!this.luts1[ageGroup]) {
            this.updateLut1(ageGroup);
        }
        return this.luts1[ageGroup];
    }

    getLut2ByName(ageGroup: string): { [K in number]: number } {
        if (!this.luts2[ageGroup]) {
            this.updateLut2(ageGroup);
        }
        return this.luts2[ageGroup];
    }

    acceptUpdate(update: Partial<IModificationValuesVaccination>): void {
        this.modificationValues = {...this.modificationValues, ...update};
    }

    getVaccinationConfig(ageGroup: string): IVaccinationConfig {

        const categoryPre = TimeUtil.formatCategoryDate(ModelInstants.getInstance().getPreInstant());
        const baseDataPre = BaseData.getInstance().findBaseData(categoryPre);

        const absVacc1 = BaseData.getVacc1(baseDataPre, ageGroup);
        const grpVacc1 = absVacc1 / Demographics.getInstance().findAgeGroupByName(ageGroup).getAbsValue();

        const absVacc2 = BaseData.getVacc2(baseDataPre, ageGroup);
        const grpVacc2 = absVacc2 / Demographics.getInstance().findAgeGroupByName(ageGroup).getAbsValue();

        const pA1: ICoordinate = {
            x: ModelInstants.getInstance().getPreInstant(),
            y: grpVacc1
        };
        const pA2: ICoordinate = {
            x: ModelInstants.getInstance().getPreInstant(),
            y: grpVacc2
        };

        const sDDefault = 1.25;
        const sCDefault = 0.002;

        let vaccinationCurve: IVaccinationConfig = this.modificationValues.vaccinationCurves?.[ageGroup];
        if (!vaccinationCurve) {

            const cA1: ICoordinate = {
                x: ModelInstants.getInstance().getPreInstant() + TimeUtil.MILLISECONDS_PER____DAY * 60,
                y: grpVacc1
            };
            const cB1: ICoordinate = {
                x: ModelInstants.getInstance().getMaxInstant() - TimeUtil.MILLISECONDS_PER____DAY * 60,
                y: 0.5
            };
            const cA2: ICoordinate = {
                x: ModelInstants.getInstance().getPreInstant() + TimeUtil.MILLISECONDS_PER____DAY * 60,
                y: grpVacc2
            };
            const cB2: ICoordinate = {
                x: ModelInstants.getInstance().getMaxInstant() - TimeUtil.MILLISECONDS_PER____DAY * 60,
                y: 0.5
            };
            const pBN: ICoordinate = {
                x: ModelInstants.getInstance().getMaxInstant(),
                y: 0.5
            };
            vaccinationCurve = {
                pA1,
                cA1,
                cB1,
                pA2,
                cA2,
                cB2,
                pBN,
                sD: sDDefault,
                sC: sCDefault
            }

        }

        // temporary, so existing configs get values
        if (!vaccinationCurve.sD) {
            vaccinationCurve.sD = sDDefault;
        }
        if (!vaccinationCurve.sC) {
            vaccinationCurve.sC = sCDefault;
        }
        if (!vaccinationCurve.cA2) {
            vaccinationCurve.cA2 = {
                x: ModelInstants.getInstance().getPreInstant() + TimeUtil.MILLISECONDS_PER____DAY * 60,
                y: grpVacc2
            };
        }
        if (!vaccinationCurve.cB2) {
            vaccinationCurve.cB2 = {
                x: ModelInstants.getInstance().getMaxInstant() - TimeUtil.MILLISECONDS_PER____DAY * 60,
                y: 0.5
            };
        }



        vaccinationCurve.pA1 = {...pA1}
        vaccinationCurve.pA2 = {...pA2}

        // code for a non-vaccination scenario - needs to be completed with the vacc2 coordinates to work
        // this.acceptUpdate(this.modificationValues);
        // console.log('this.modificationValues', this.modificationValues);

        // return vaccinationCurve;
        // return {
        //     pA: {
        //         x: ModelInstants.getInstance().getPreInstant(),
        //         y: 0
        //     },
        //     cA: {
        //         x: ModelInstants.getInstance().getPreInstant() + TimeUtil.MILLISECONDS_PER____DAY * 10,
        //         y: 0
        //     },
        //     cB: {
        //         x: ModelInstants.getInstance().getMaxInstant() - TimeUtil.MILLISECONDS_PER____DAY * 10,
        //         y: 0
        //     },
        //     pB: {
        //         x: ModelInstants.getInstance().getMaxInstant(),
        //         y: 0
        //     },
        //     sD: sDDefault,
        //     sC: sCDefault
        // }

        return vaccinationCurve;

    }

    setVaccinationCurve(ageGroup: string, vaccinationCurve: IVaccinationConfig): void {
        this.modificationValues.vaccinationCurves[ageGroup] = vaccinationCurve;
        this.updateLut1(ageGroup);
    }

    updateLut1(ageGroup: string): void {

        const vaccinationCurve = this.getVaccinationConfig(ageGroup);
        console.log('vaccinationCurve', vaccinationCurve);

        const lutCount = 100;

        const bezier1 = new Bezier(vaccinationCurve.pA1, vaccinationCurve.cA1, vaccinationCurve.cB1, vaccinationCurve.pBN);
        const lut1 = bezier1.getLUT(lutCount);

        const minChartInstant = ModelInstants.getInstance().getPreInstant();
        const maxChartInstant = ModelInstants.getInstance().getMaxInstant();

        let lutIndex = 0;
        const lutVacc1: { [K in number]: number} = {};
        for (let curInstant = minChartInstant; curInstant <= maxChartInstant; curInstant += ModelStateIntegrator.DT) {

            // iterate lut until lut value is equal or greater than cur instant
            while (curInstant > lut1[lutIndex].x) {
                lutIndex++;
                if (lutIndex >= lut1.length) {
                    break;
                }
            }

            if (lutIndex > 0) {
                const diffCurX = curInstant - lut1[lutIndex - 1].x;
                const diffLutX = lut1[lutIndex].x - lut1[lutIndex - 1].x;
                const diffLutY = lut1[lutIndex].y - lut1[lutIndex - 1].y;
                lutVacc1[curInstant] = lut1[lutIndex - 1].y + diffLutY * diffCurX / diffLutX;
            } else {
                lutVacc1[curInstant] = lut1[0].y;
            }

        }
        this.luts1[ageGroup] = lutVacc1;

    }

    updateLut2(ageGroup: string): void {

        const vaccinationCurve = this.getVaccinationConfig(ageGroup);

        const lutCount = 100;

        const bezier2 = new Bezier(vaccinationCurve.pA2, vaccinationCurve.cA2, vaccinationCurve.cB2, vaccinationCurve.pBN);
        const lut2 = bezier2.getLUT(lutCount);

        const minChartInstant = ModelInstants.getInstance().getPreInstant();
        const maxChartInstant = ModelInstants.getInstance().getMaxInstant();

        let lutIndex = 0;
        const lutVacc2: { [K in number]: number} = {};
        for (let curInstant = minChartInstant; curInstant <= maxChartInstant; curInstant += ModelStateIntegrator.DT) {

            // iterate lut until lut value is equal or greater than cur instant
            while (curInstant > lut2[lutIndex].x) {
                lutIndex++;
                if (lutIndex >= lut2.length) {
                    break;
                }
            }

            if (lutIndex > 0) {
                const diffCurX = curInstant - lut2[lutIndex - 1].x;
                const diffLutX = lut2[lutIndex].x - lut2[lutIndex - 1].x;
                const diffLutY = lut2[lutIndex].y - lut2[lutIndex - 1].y;
                lutVacc2[curInstant] = lut2[lutIndex - 1].y + diffLutY * diffCurX / diffLutX;
            } else {
                lutVacc2[curInstant] = lut2[0].y;
            }

        }
        this.luts2[ageGroup] = lutVacc2;

    }

}