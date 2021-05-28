import { ControlsConstants } from './ControlsConstants';
import { ControlsVaccination } from '../controls/ControlsVaccination';
import { ModelConstants } from '../../model/ModelConstants';
import { IconSlider } from './IconSlider';
import { Slider } from './Slider';

export class SliderVaccination extends Slider {

    constructor(max: number) {

        const container = document.createElement('div');
        container.classList.add('slider-modification');

        document.getElementById('slidersVaccinationDiv').appendChild(container);

        super({
            container,
            min: 0,
            max: max,
            step: 1000,
            values: [0],
            ticks: [
                0,
                50000,
                100000,
                150000,
                200000
            ],
            label: 'doses per day',
            thumbCreateFunction: (index: number) => {
                return new IconSlider();
            },
            labelFormatFunction: (index, value, type) => {
                return `${value.toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FIXED)}`;
            },
            valueChangeFunction: (value, index, type) => {
                if (type === 'stop' || type === 'input') {
                    ControlsVaccination.getInstance().handleChange();
                }
            },
            thumbPickedFunction: (index) => {
                // nothing
            },
            inputFunctions: {
                inputFormatFunction: (index, value) => {
                    return `${value.toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FIXED)}`;
                },
                inputHandleFunction: (index, value) => {
                    return parseFloat(value);
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