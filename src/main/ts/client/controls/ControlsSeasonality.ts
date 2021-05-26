import { ModificationSeasonality } from '../../common/modification/ModificationSeasonality';
import { ObjectUtil } from '../../util/ObjectUtil';
import { SliderModification } from '../gui/SliderModification';
import { SliderSeasonality } from '../gui/SliderSeasonality';
import { Controls } from './Controls';

/**
 * controller for editing seasonality modifications
 *
 * @author h.fleischer
 * @since 25.05.2021
 */
export class ControlsSeasonality {

    static getInstance(): ControlsSeasonality {
        if (ObjectUtil.isEmpty(this.instance)) {
            this.instance = new ControlsSeasonality();
        }
        return this.instance;
    }
    private static instance: ControlsSeasonality;

    private sliderAmount: SliderSeasonality;
    private modification: ModificationSeasonality;

    constructor() {
        this.sliderAmount = new SliderSeasonality();
    }

    handleChange(): void {
        this.modification.acceptUpdate({
            seasonality: this.sliderAmount.getValue()
        });
        SliderModification.getInstance().indicateUpdate(this.modification.getId());
    }

    acceptModification(modification: ModificationSeasonality): void {
        Controls.acceptModification(modification);
        this.modification = modification;
        this.sliderAmount.setValue(this.modification.getSeasonality());
    }

}