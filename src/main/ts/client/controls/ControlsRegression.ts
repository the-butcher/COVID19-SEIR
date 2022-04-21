import { last } from '@amcharts/amcharts4/.internal/core/utils/Array';
import { Modifications } from '../../common/modification/Modifications';
import { ModelConstants } from '../../model/ModelConstants';
import { IRegressionResult } from '../../model/regression/IRegressionResult';
import { ObjectUtil } from '../../util/ObjectUtil';
import { ControlsConstants } from '../gui/ControlsConstants';
import { SliderModification } from '../gui/SliderModification';
import { SliderRegression } from '../gui/SliderRegression';
import { StorageUtil } from '../storage/StorageUtil';
import { IRegressionConfig } from './../../common/modification/IModificationValuesRegression';
import { ModificationRegression } from './../../common/modification/ModificationRegression';
import { ChartAgeGroup } from './../chart/ChartAgeGroup';
import { ModelActions } from './../gui/ModelActions';
import { Controls } from './Controls';

/**
 * controller for editing regression modification
 *
 * @author h.fleischer
 * @since 01.11.2021
 */
export class ControlsRegression {

    static getInstance(): ControlsRegression {
        if (ObjectUtil.isEmpty(this.instance)) {
            this.instance = new ControlsRegression();
        }
        return this.instance;
    }
    private static instance: ControlsRegression;

    private sliderBackDays: SliderRegression;
    private sliderPolyShares: SliderRegression;

    private modification: ModificationRegression;

    constructor() {
        this.sliderBackDays = new SliderRegression("back days", 1, ModelConstants.RANGE_________BACK_DAYS, -10, -5);
        this.sliderPolyShares = new SliderRegression("poly shares", 0.05, ModelConstants.RANGE____PERCENTAGE_100, 0.5, 0.75);
        this.modification = Modifications.getInstance().findModificationsByType('REGRESSION').find(m => true) as ModificationRegression;
    }

    /**
     * get either a multiplier or a correction to be shown in the chart
     * @param instant
     * @returns
     */
    getRenderableRegressionResult(instant: number): IRegressionResult {
        const modelActions = ModelActions.getInstance();
        const lastRegressionType = modelActions.getLastRegressionType();
        if (lastRegressionType === 'MULTIPLIER') {
            return this.modification.getMultiplierRegression(instant, modelActions.getCategory());
        } else if (lastRegressionType === 'CORRECTION') {
            return this.modification.getCorrectionRegression(instant, modelActions.getAgeGroup().getName());
        } else if (lastRegressionType === 'VACCKEY') {
            return this.modification.getVaccinationRegression(instant, modelActions.getAgeGroup().getName(), modelActions.getVaccKey());
        } else {
            throw new Error('unrecognized regression type: ' + lastRegressionType);
        }
    }

    handleChange(): void {

        const regressionConfig: IRegressionConfig = {
            back_days_a: this.sliderBackDays.getValue(0),
            back_days_b: this.sliderBackDays.getValue(1),
            poly_shares: [this.sliderPolyShares.getValue(0), this.sliderPolyShares.getValue(1)]
        }
        const multiplier_configs: { [K in string]: IRegressionConfig } = {};
        const correction_configs: { [K in string]: IRegressionConfig } = {};
        const vaccination_configs: { [K in string]: { [K in string]: IRegressionConfig } } = {};

        const modelActions = ModelActions.getInstance();

        const lastRegressionPointerType = ModelActions.getInstance().getLastRegressionType();
        if (lastRegressionPointerType === 'MULTIPLIER') {
            multiplier_configs[modelActions.getCategory()] = regressionConfig;
        } else if (lastRegressionPointerType === 'CORRECTION') {
            correction_configs[modelActions.getAgeGroup().getName()] = regressionConfig;
        } else if (lastRegressionPointerType === 'VACCKEY') {
            vaccination_configs[modelActions.getAgeGroup().getName()] = {};
            vaccination_configs[modelActions.getAgeGroup().getName()][modelActions.getVaccKey()] = regressionConfig;
        }

        this.modification.acceptUpdate({
            multiplier_configs,
            correction_configs,
            vaccination_configs
        });

        SliderModification.getInstance().indicateUpdate(this.modification.getId());
        StorageUtil.getInstance().setSaveRequired(true);
        ControlsConstants.MODIFICATION_PARAMS[this.modification.getKey()].handleModificationUpdate(); // update model after modification update

        ChartAgeGroup.getInstance().renderRegressionData();


    }

    handleRegressionPointerChange(): void {
        this.updateSliderValues();
    }

    updateSliderValues(): void {

        // console.log('this.regressionPointer', this.regressionPointer, this.modification);
        if (this.modification) {

            const lastRegressionType = ModelActions.getInstance().getLastRegressionType();
            const modelActions = ModelActions.getInstance();
            let regressionConfig: IRegressionConfig;

            let label: string;
            if (lastRegressionType === 'MULTIPLIER') {
                regressionConfig = this.modification.getMultiplierConfig(modelActions.getCategory());
                label = modelActions.getCategory();
            } else if (lastRegressionType === 'CORRECTION') {
                regressionConfig = this.modification.getCorrectionConfig(modelActions.getAgeGroup().getName());
                label = modelActions.getAgeGroup().getName();
            } else if (lastRegressionType === 'VACCKEY') {
                regressionConfig = this.modification.getVaccinationConfig(modelActions.getAgeGroup().getName(), modelActions.getVaccKey());
                label = `${modelActions.getAgeGroup().getName()}-${modelActions.getVaccKey()}`;
            }

            if (regressionConfig) {
                this.sliderBackDays.setLabel(label);
                this.sliderPolyShares.setLabel(label);
                this.sliderBackDays.setValue(0, regressionConfig.back_days_a);
                this.sliderBackDays.setValue(1, regressionConfig.back_days_b);
                this.sliderPolyShares.setValue(0, regressionConfig.poly_shares[0]);
                this.sliderPolyShares.setValue(1, regressionConfig.poly_shares[1]);
            }

            if (ChartAgeGroup.getInstance().getChartMode() === 'CONTACT') {
                if (lastRegressionType === 'MULTIPLIER') {
                    ChartAgeGroup.getInstance().setAxisPercentBounds(0, 1);
                } else if (lastRegressionType === 'CORRECTION') {
                    ChartAgeGroup.getInstance().setAxisPercentBounds(0, 2);
                }
            }

        }

    }

    acceptModification(modification: ModificationRegression): void {

        Controls.acceptModification(modification);
        this.modification = modification;

        this.updateSliderValues();

        requestAnimationFrame(() => {
            this.sliderBackDays.handleResize();
            this.sliderPolyShares.handleResize();
        });

        this.modification = modification;

    }

}