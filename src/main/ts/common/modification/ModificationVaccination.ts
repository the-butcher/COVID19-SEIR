import { Demographics } from './../demographics/Demographics';
import { TimeUtil } from './../../util/TimeUtil';
// @ts-ignore
import { Bezier } from 'bezier-js';
import { IModificationValuesVaccination } from './IModificationValuesVaccination';
import { AModification } from './AModification';
import { IVaccinationCurve } from './IVaccinationCurve';
import { ModelInstants } from '../../model/ModelInstants';
import { ModelStateIntegrator } from '../../model/state/ModelStateIntegrator';
import { ICoordinate } from '../../util/ICoordinate';
import { BaseData } from '../../model/calibration/BaseData';
import { ModelConstants } from '../../model/ModelConstants';

/**
 * implementation of IModification to hold configurable value for the vaccination model
 *
 * @author h.fleischer
 * @since 23.04.2021
 */
export class ModificationVaccination extends AModification<IModificationValuesVaccination> {

    private readonly luts: { [K in string]: { [K in number]: number}};

    constructor(modificationParams: IModificationValuesVaccination) {
        super('INSTANT', modificationParams);
        this.luts = {};
        // Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
        //     this.updateLut(ageGroup.getName());
        // });
        // console.warn('vacc create');
    }

    getLutByName(ageGroup: string): { [K in number]: number } {
        if (!this.luts[ageGroup]) {
            this.updateLut(ageGroup);
        }
        return this.luts[ageGroup];
    }

    acceptUpdate(update: Partial<IModificationValuesVaccination>): void {
        this.modificationValues = {...this.modificationValues, ...update};
    }

    getVaccinationCurve(ageGroup: string): IVaccinationCurve {

        console.warn(ageGroup);

        let vaccinationCurve: IVaccinationCurve = this.modificationValues.vaccinationCurves[ageGroup];
        if (!vaccinationCurve) {

            const categoryPre = TimeUtil.formatCategoryDate(ModelInstants.getInstance().getPreInstant());
            const absVacc1 = BaseData.getInstance().findBaseData(categoryPre)[ageGroup][ModelConstants.BASE_DATA_INDEX_VACC1ST];
            const grpVacc1 = absVacc1 / Demographics.getInstance().findAgeGroupByName(ageGroup).getAbsValue();

            const pA: ICoordinate = {
                x: ModelInstants.getInstance().getPreInstant(),
                y: grpVacc1
            };
            const cA: ICoordinate = {
                x: ModelInstants.getInstance().getPreInstant() + TimeUtil.MILLISECONDS_PER____DAY * 60,
                y: grpVacc1
            };
            const cB: ICoordinate = {
                x: ModelInstants.getInstance().getMaxInstant() - TimeUtil.MILLISECONDS_PER____DAY * 60,
                y: 0.5
            };
            const pB: ICoordinate = {
                x: ModelInstants.getInstance().getMaxInstant(),
                y: 0.5
            };

            vaccinationCurve = {
                pA,
                cA,
                cB,
                pB
            }

        }
        return vaccinationCurve;

    }

    setVaccinationCurve(ageGroup: string, vaccinationCurve: IVaccinationCurve): void {
        this.modificationValues.vaccinationCurves[ageGroup] = vaccinationCurve;
        this.updateLut(ageGroup);
    }

    updateLut(ageGroup: string): void {

        const vaccinationCurve = this.getVaccinationCurve(ageGroup);

        const bezier = new Bezier(vaccinationCurve.pA, vaccinationCurve.cA, vaccinationCurve.cB, vaccinationCurve.pB);
        const lut = bezier.getLUT(100);

        const minChartInstant = ModelInstants.getInstance().getPreInstant();
        const maxChartInstant = ModelInstants.getInstance().getMaxInstant();

        let lutIndex = 0;
        const lutVacc: { [K in number]: number} = {};
        for (let curInstant = minChartInstant; curInstant <= maxChartInstant; curInstant += ModelStateIntegrator.DT) {

            // iterate lut until lut value is equal or greater than cur instant
            while (curInstant > lut[lutIndex].x) {
                lutIndex++;
                if (lutIndex >= lut.length) {
                    break;
                }
            }

            if (lutIndex > 0) {
                const diffCurX = curInstant - lut[lutIndex - 1].x;
                const diffLutX = lut[lutIndex].x - lut[lutIndex - 1].x;
                const diffLutY = lut[lutIndex].y - lut[lutIndex - 1].y;
                lutVacc[curInstant] = lut[lutIndex - 1].y + diffLutY * diffCurX / diffLutX;
            } else {
                lutVacc[curInstant] = lut[0].y;
            }

        }
        this.luts[ageGroup] = lutVacc;

    }

}