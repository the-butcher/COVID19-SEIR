import { ControlsTesting } from '../controls/ControlsTesting';
import { ModelConstants } from '../../model/ModelConstants';
import { IconSlider } from './IconSlider';
import { Slider } from './Slider';

export class SliderTestingCategory extends Slider {

    private readonly slider: Slider;
    private readonly group: string;

    constructor(group: string) {

        const container = document.createElement('div');
        container.classList.add('slider-modification');

        document.getElementById('slidersTestingDiv').appendChild(container);

        super({
            container,
            min: Math.min(...ModelConstants.RANGE__PERCENTAGE_100),
            max: Math.max(...ModelConstants.RANGE__PERCENTAGE_100),
            step: 0.01,
            values: [1.0],
            ticks: [...ModelConstants.RANGE__PERCENTAGE_100],
            label: group,
            thumbCreateFunction: (index: number) => {
                return new IconSlider();
            },
            labelFormatFunction: (index, value, type) => {
                if (type === 'tick') {
                    return `${(value * 100).toLocaleString(undefined, ModelConstants.LOCALE_FORMAT_FIXED)}%`;
                } else {
                    return `${(value * 100).toLocaleString(undefined, ModelConstants.LOCALE_FORMAT_FLOAT_1)}%`;
                }
            },
            valueChangeFunction: (value, index, type) => {
                if (type === 'stop' || type === 'input') {
                    ControlsTesting.getInstance().handleChange();
                }
            },
            thumbPickedFunction: (index) => {
                // nothing
            },
            inputFunctions: {
                inputFormatFunction: (index, value) => {
                    return `${(value * 100).toLocaleString(undefined, ModelConstants.LOCALE_FORMAT_FLOAT_1)}`;
                },
                inputHandleFunction: (index, value) => {
                    return parseFloat(value) / 100;
                }
            }
        });

        this.group = group;

    }

    getName(): string {
        return this.group;
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