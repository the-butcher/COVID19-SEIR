import { ASliderElement } from './ASliderElement';
import { ISliderElementParams, LABEL__TYPE, Slider } from './Slider';

/**
 * a single tick along a slider, a small vertical indicator and a corresponding, single label
 *
 * @author h.fleischer
 * @since 13.05.2021
 */
export class SliderTick extends ASliderElement {

    constructor(params: ISliderElementParams) {
        super(params);
        const tickLineContainer = document.createElement('div');
        tickLineContainer.classList.add(Slider.CLASS_TICK________LINE);
        this.getContainer().insertBefore(tickLineContainer, this.getLabelContainer());
    }

}