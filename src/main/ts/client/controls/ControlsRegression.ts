import { ModelConstants } from '../../model/ModelConstants';
import { ObjectUtil } from '../../util/ObjectUtil';
import { ControlsConstants } from '../gui/ControlsConstants';
import { SliderModification } from '../gui/SliderModification';
import { SliderRegression } from '../gui/SliderRegression';
import { SliderSetting } from '../gui/SliderSetting';
import { StorageUtil } from '../storage/StorageUtil';
import { ModificationRegression } from './../../common/modification/ModificationRegression';
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
    private sliderPolyDays: SliderRegression;

    private modification: ModificationRegression;

    constructor() {

        this.sliderBackDays = new SliderRegression("back days", ModelConstants.RANGE_________BACK_DAYS);
        this.sliderPolyDays = new SliderRegression("poly days", ModelConstants.RANGE_________POLY_DAYS);

    }

    handleChange(): void {

        const backDays = this.sliderBackDays.getValue();
        const polyDays = this.sliderPolyDays.getValue();

        this.modification.acceptUpdate({
            back_days: backDays,
            poly_days: polyDays
        });

        SliderModification.getInstance().indicateUpdate(this.modification.getId());
        StorageUtil.getInstance().setSaveRequired(true);
        ControlsConstants.MODIFICATION_PARAMS[this.modification.getKey()].handleModificationUpdate(); // update model after modification update

    }

    acceptModification(modification: ModificationRegression): void {

        Controls.acceptModification(modification);
        this.modification = modification;

        this.sliderBackDays.setValue(this.modification.getBackDays());
        this.sliderPolyDays.setValue(this.modification.getPolyDays());

        requestAnimationFrame(() => {
            this.sliderBackDays.handleResize();
            this.sliderPolyDays.handleResize();
        });

        this.modification = modification;

    }

}