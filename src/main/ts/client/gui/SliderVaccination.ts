import { ControlsVaccination } from './../controls/ControlsVaccination';
import { ControlsSettings } from '../controls/ControlsSettings';
import { ModelConstants } from '../../model/ModelConstants';
import { IconSlider } from './IconSlider';
import { Slider } from './Slider';
import { ControlsConstants } from './ControlsConstants';

export class SliderVaccination extends Slider {

    private readonly ageGroupName: string;

    constructor(ageGroupName: string) {

        const container = document.createElement('div');
        container.className = 'slider-modification';

        document.getElementById('slidersVaccinationDiv').appendChild(container);

        // let labelFormat = ControlsConstants.LOCALE_FORMAT_FIXED;
        // let inputFormat = ControlsConstants.LOCALE_FORMAT_FLOAT_1;
        // if (steps < 0.01) {
        //     labelFormat = ControlsConstants.LOCALE_FORMAT_FLOAT_1;
        //     inputFormat = ControlsConstants.LOCALE_FORMAT_FLOAT_2;
        // }
        const range = ModelConstants.RANGE____PERCENTAGE_100;

        super({
            container,
            min: Math.min(...range),
            max: Math.max(...range),
            step: 0.01,
            values: [0.0, 0.0],
            ticks: [...range],
            label: ageGroupName,
            thumbCreateFunction: (index: number) => {
                return new IconSlider();
            },
            labelFormatFunction: (index, value, type) => {
                if (type === 'tick') {
                    return `${(value * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FIXED)}%`;
                } else {
                    return `${(value * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_1)}%`;
                }
            },
            handleValueChange: (value, index, type) => {
                if (type === 'stop' || type === 'input') {
                    ControlsVaccination.getInstance().handleChange();
                }
            },
            handleThumbPicked: (index) => {
                // nothing
            },
            inputFunctions: {
                inputFormatFunction: (index, value) => {
                    return `${(value * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_1)}`;
                },
                inputHandleFunction: (index, value) => {
                    return parseFloat(value) / 100;
                }
            }
        });

        this.ageGroupName = ageGroupName;

    }

    getName(): string {
        return this.ageGroupName;
    }

    getValue(index: number): number {
        return this.getSliderThumbs()[index].getValue();
    }

    setValue(index: number, value: number): void {
        const thumbElement = this.getSliderThumbs()[index];
        thumbElement.setValue(value);
        this.redrawSliderElement(thumbElement, 7, true);
    }

}