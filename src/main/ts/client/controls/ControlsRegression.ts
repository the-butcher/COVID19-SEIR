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
        const regressionPointer = ModelActions.getInstance().getRegressionPointer();
        if (regressionPointer.type === 'MULTIPLIER') {
            return this.modification.getMultiplierRegression(instant, regressionPointer.value);
        } else if (regressionPointer.type === 'CORRECTION') {
            return this.modification.getCorrectionRegression(instant, regressionPointer.value);
        } else {
            throw new Error('neither category nor agegroup set in regression controls');
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

        const regressionPointer = ModelActions.getInstance().getRegressionPointer();
        if (regressionPointer.type === 'MULTIPLIER') {
            multiplier_configs[regressionPointer.value] = regressionConfig;
        } else if (regressionPointer.type === 'CORRECTION') {
            correction_configs[regressionPointer.value] = regressionConfig;
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
        this.updateSliderValues();
    }

    updateSliderValues(): void {

        // console.log('this.regressionPointer', this.regressionPointer, this.modification);
        if (this.modification) {

            const regressionPointer = ModelActions.getInstance().getRegressionPointer();
            let regressionConfig: IRegressionConfig;
            if (regressionPointer.type === 'MULTIPLIER') {
                regressionConfig = this.modification.getMultiplierConfig(regressionPointer.value);
            } else if (regressionPointer.type === 'CORRECTION') {
                regressionConfig = this.modification.getCorrectionConfig(regressionPointer.value);
            }

            if (regressionConfig) {
                this.sliderBackDays.setLabel(regressionPointer.value);
                this.sliderPolyShares.setLabel(regressionPointer.value);
                this.sliderBackDays.setValue(0, regressionConfig.back_days_a);
                this.sliderBackDays.setValue(1, regressionConfig.back_days_b);
                this.sliderPolyShares.setValue(0, regressionConfig.poly_shares[0]);
                this.sliderPolyShares.setValue(1, regressionConfig.poly_shares[1]);
            }

            if (ChartAgeGroup.getInstance().getChartMode() === 'CONTACT') {
                const regressionPointer = ModelActions.getInstance().getRegressionPointer();
                if (regressionPointer.type === 'MULTIPLIER') {
                    ChartAgeGroup.getInstance().setAxisPercentBounds(0, 1);
                } else if (regressionPointer.type === 'CORRECTION') {
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