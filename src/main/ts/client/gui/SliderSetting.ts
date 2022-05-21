import { ControlsSettings } from '../controls/ControlsSettings';
import { ModelConstants } from '../../model/ModelConstants';
import { IconSlider } from './IconSlider';
import { Slider } from './Slider';
import { ControlsConstants } from './ControlsConstants';

export class SliderSetting extends Slider {

    private readonly compartmentName: string;

    constructor(compartmentName: string, range: number[], steps: number, percent: boolean, parentContainer: string, handleChange: () => void) {

        const container = document.createElement('div');
        container.className = 'slider-modification';

        document.getElementById(parentContainer).appendChild(container);

        let tickFormat = ControlsConstants.LOCALE_FORMAT_FIXED;
        let valueFormat = ControlsConstants.LOCALE_FORMAT_FLOAT_1;
        if (steps < 0.1) {
            tickFormat = ControlsConstants.LOCALE_FORMAT_FLOAT_2;
            valueFormat = ControlsConstants.LOCALE_FORMAT_FLOAT_2;
        } else if (steps < 1) {
            tickFormat = ControlsConstants.LOCALE_FORMAT_FLOAT_1;
            valueFormat = ControlsConstants.LOCALE_FORMAT_FLOAT_2;
        }

        super({
            container,
            min: Math.min(...range),
            max: Math.max(...range),
            step: steps,
            values: [1.0],
            ticks: [...range],
            label: compartmentName,
            thumbCreateFunction: (index: number) => {
                return new IconSlider();
            },
            labelFormatFunction: (index, value, type) => {
                if (percent) {
                    if (type === 'tick') {
                        return `${(value * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FIXED)}%`;
                    } else {
                        return `${(value * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_1)}%`;
                    }
                } else {
                    if (type === 'tick') {
                        return value.toLocaleString(undefined, tickFormat);
                    } else {
                        return value.toLocaleString(undefined, valueFormat);
                    }
                }
            },
            handleValueChange: (value, index, type) => {
                if (type === 'stop' || type === 'input') {
                    handleChange();
                }
            },
            handleThumbPicked: (index) => {
                // nothing
            },
            inputFunctions: {
                inputFormatFunction: (index, value) => {
                    if (percent) {
                        return `${(value * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_1)}`;
                    } else {
                        return value.toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_1);
                    }
                },
                inputHandleFunction: (index, value) => {
                    if (percent) {
                        return parseFloat(value) / 100;
                    } else {
                        return parseFloat(value);
                    }
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