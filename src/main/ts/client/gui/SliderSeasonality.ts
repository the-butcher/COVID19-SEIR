import { ControlsSeasonality } from '../controls/ControlsSeasonality';
import { ModelConstants } from '../../model/ModelConstants';
import { IconSlider } from './IconSlider';
import { Slider } from './Slider';
import { ControlsConstants } from './ControlsConstants';

export class SliderSeasonality extends Slider {

    private readonly category: string;

    constructor(category: string) {

        const container = document.createElement('div');
        container.classList.add('slider-modification');
        document.getElementById('slidersSeasonalityDiv').appendChild(container);

        super({
            container,
            min: Math.min(...ModelConstants.RANGE____PERCENTAGE__50),
            max: Math.max(...ModelConstants.RANGE____PERCENTAGE__50),
            step: 0.01,
            values: [0.90],
            ticks: [...ModelConstants.RANGE____PERCENTAGE__50],
            label: category,
            thumbCreateFunction: (index: number) => {
                return new IconSlider();
            },
            labelFormatFunction: (index, value, type) => {
                return `${(value * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FIXED)}%`;
            },
            handleValueChange: (value, index, type) => {
                if (type === 'stop' || type === 'input') {
                    ControlsSeasonality.getInstance().handleChange();
                }
            },
            handleThumbPicked: (index) => {
                // nothing
            },
            inputFunctions: {
                inputFormatFunction: (index, value) => {
                    return `${(value * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FIXED)}`;
                },
                inputHandleFunction: (index, value) => {
                    return parseFloat(value) / 100;
                }
            }
        });

        this.category = category;


    }

    getName(): string {
        return this.category;
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