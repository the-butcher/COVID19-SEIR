import { ControlsSettings } from '../controls/ControlsSettings';
import { ModelConstants } from '../../model/ModelConstants';
import { IconSlider } from './IconSlider';
import { Slider } from './Slider';
import { ControlsConstants } from './ControlsConstants';

export class SliderSetting extends Slider {

    private readonly compartmentName: string;

    constructor(compartmentName: string, range: number[], steps: number) {

        const container = document.createElement('div');
        container.className = 'slider-modification';

        document.getElementById('slidersSettingsDiv').appendChild(container);

        let labelFormat = ControlsConstants.LOCALE_FORMAT_FIXED;
        let inputFormat = ControlsConstants.LOCALE_FORMAT_FLOAT_1;
        if (steps < 0.01) {
            labelFormat = ControlsConstants.LOCALE_FORMAT_FLOAT_1;
            inputFormat = ControlsConstants.LOCALE_FORMAT_FLOAT_2;
        }

        super({
            container,
            min: Math.min(...ModelConstants.RANGE__PERCENTAGE_100),
            max: Math.max(...ModelConstants.RANGE__PERCENTAGE_100),
            step: 0.01,
            values: [1.0],
            ticks: [...ModelConstants.RANGE__PERCENTAGE_100],
            label: compartmentName,
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
                    ControlsSettings.getInstance().handleChange();
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

        this.compartmentName = compartmentName;

    }

    getName(): string {
        return this.compartmentName;
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