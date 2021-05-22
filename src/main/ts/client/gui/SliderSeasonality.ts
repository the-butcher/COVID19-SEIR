import { ControlsSeasonality } from '../controls/ControlsSeasonality';
import { ModelConstants } from '../../model/ModelConstants';
import { IconSlider } from './IconSlider';
import { Slider } from './Slider';

export class SliderSeasonality extends Slider {

    constructor() {

        const container = document.createElement('div');
        container.classList.add('slider-modification');

        document.getElementById('slidersSeasonalityDiv').appendChild(container);

        super({
            container,
            min: Math.min(...ModelConstants.RANGE__PERCENTAGE__60),
            max: Math.max(...ModelConstants.RANGE__PERCENTAGE__60),
            step: 0.01,
            values: [0.90],
            ticks: [...ModelConstants.RANGE__PERCENTAGE__60],
            label: 'amount',
            thumbCreateFunction: (index: number) => {
                return new IconSlider();
            },
            labelFormatFunction: (index, value, type) => {
                return `${(value * 100).toLocaleString(undefined, ModelConstants.LOCALE_FORMAT_FIXED)}%`;
            },
            valueChangeFunction: (value, index, type) => {
                if (type === 'stop' || type === 'input') {
                    ControlsSeasonality.getInstance().handleChange();
                }
            },
            thumbPickedFunction: (index) => {
                // nothing
            },
            inputFunctions: {
                inputFormatFunction: (index, value) => {
                    return `${(value * 100).toLocaleString(undefined, ModelConstants.LOCALE_FORMAT_FIXED)}`;
                },
                inputHandleFunction: (index, value) => {
                    return parseFloat(value) / 100;
                }
            }
        });

    }

    getValue(): number {
        return this.getSliderThumbs()[0].getValue();
    }

    setValue(value: number): void {
        const thumbElement = this.getSliderThumbs()[0];
        thumbElement.setValue(value);
        this.redrawSliderElement(thumbElement, 7, true);
    }

}