import { ASliderElement } from './ASliderElement';
import { ISliderAssetParams, ISliderElementParams, LABEL__TYPE, Slider } from './Slider';

/**
 * a single asset along a slide, not a tick, not a draggable thumb
 *
 * @author h.fleischer
 * @since 29.05.2021
 */
export class SliderAsset extends ASliderElement {


    constructor(params: ISliderAssetParams) {

        super(params);

        const thumbContentContainer = document.createElement('div');
        thumbContentContainer.classList.add(Slider.CLASS_THUMB____CONTENT);
        this.getContainer().appendChild(thumbContentContainer);

        const icon = params.thumbCreateFunction(params.index);
        thumbContentContainer.appendChild(icon.getSvgContainer());
        const assetContainerContainer = document.createElement('div');
        this.getContainer().insertBefore(assetContainerContainer, this.getLabelContainer());

    }

}