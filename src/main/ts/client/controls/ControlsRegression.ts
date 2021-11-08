import { ChartAgeGroup } from './../chart/ChartAgeGroup';
import { ModelConstants } from '../../model/ModelConstants';
import { IRegressionResult } from '../../model/regression/IRegressionResult';
import { ObjectUtil } from '../../util/ObjectUtil';
import { ControlsConstants } from '../gui/ControlsConstants';
import { SliderModification } from '../gui/SliderModification';
import { SliderRegression } from '../gui/SliderRegression';
import { StorageUtil } from '../storage/StorageUtil';
import { IRegressionConfig } from './../../common/modification/IModificationValuesRegression';
import { ModificationRegression } from './../../common/modification/ModificationRegression';
import { IRegressionPointer, ModelActions } from './../gui/ModelActions';
import { Controls } from './Controls';
import { Modifications } from '../../common/modification/Modifications';

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
    private sliderPolyWeight: SliderRegression;

    private modification: ModificationRegression;

    /**
     * points to either a category (multiplier) or an age-group (correction)
     */
    private regressionPointer: IRegressionPointer;

    constructor() {
        this.sliderBackDays = new SliderRegression("back days", ModelConstants.RANGE_________BACK_DAYS, -10, -5);
        this.sliderPolyWeight = new SliderRegression("poly weight", ModelConstants.RANGE____PERCENTAGE_100, 0.1);
        this.modification = Modifications.getInstance().findModificationsByType('REGRESSION').find(m => true) as ModificationRegression;
    }

    /**
     * get either a multiplier or a correction to be shown in the chart
     * @param instant
     * @returns
     */
    getRenderableRegressionResult(instant: number): IRegressionResult {
        if (this.regressionPointer.type === 'MULTIPLIER') {
            return this.modification.getMultiplierRegression(instant, this.regressionPointer.value);
        } else if (this.regressionPointer.type === 'CORRECTION') {
            return this.modification.getCorrectionRegression(instant, this.regressionPointer.value);
        } else {
            throw new Error('neither category nor agegroup set in regression controls');
        }
    }

    handleChange(): void {

        const regressionConfig: IRegressionConfig = {
            back_days_a: this.sliderBackDays.getValue(0),
            back_days_b: this.sliderBackDays.getValue(1),
            poly_weight: this.sliderPolyWeight.getValue(0)
        }
        const multiplier_configs: { [K in string]: IRegressionConfig } = {};
        const correction_configs: { [K in string]: IRegressionConfig } = {};

        if (this.regressionPointer.type === 'MULTIPLIER') {
            multiplier_configs[this.regressionPointer.value] = regressionConfig;
        } else if (this.regressionPointer.type === 'CORRECTION') {
            correction_configs[this.regressionPointer.value] = regressionConfig;
        }

        this.modification.acceptUpdate({
            multiplier_configs,
            correction_configs
        });

        SliderModification.getInstance().indicateUpdate(this.modification.getId());
        StorageUtil.getInstance().setSaveRequired(true);
        ControlsConstants.MODIFICATION_PARAMS[this.modification.getKey()].handleModificationUpdate(); // update model after modification update

        ChartAgeGroup.getInstance().renderRegressionData();


    }

    handleRegressionPointerChange(): void {
        this.regressionPointer = ModelActions.getInstance().getRegressionPointer();
        this.updateSliderValues();
    }

    updateSliderValues(): void {

        // console.log('this.regressionPointer', this.regressionPointer, this.modification);
        if (this.modification) {

            let regressionConfig: IRegressionConfig;
            if (this.regressionPointer.type === 'MULTIPLIER') {
                regressionConfig = this.modification.getMultiplierConfig(this.regressionPointer.value);
                ChartAgeGroup.getInstance().setAxisPercentBounds(0, 1);
            } else if (this.regressionPointer.type === 'CORRECTION') {
                regressionConfig = this.modification.getCorrectionConfig(this.regressionPointer.value);
                ChartAgeGroup.getInstance().setAxisPercentBounds(0, 2);
            }

            if (regressionConfig) {
                this.sliderBackDays.setLabel(this.regressionPointer.value);
                this.sliderPolyWeight.setLabel(this.regressionPointer.value);
                this.sliderBackDays.setValue(0, regressionConfig.back_days_a);
                this.sliderBackDays.setValue(1, regressionConfig.back_days_b);
                this.sliderPolyWeight.setValue(0, regressionConfig.poly_weight);
            }

        }

    }

    acceptModification(modification: ModificationRegression): void {

        Controls.acceptModification(modification);
        this.modification = modification;

        this.updateSliderValues();

        requestAnimationFrame(() => {
            this.sliderBackDays.handleResize();
            this.sliderPolyWeight.handleResize();
        });

        this.modification = modification;

    }

}