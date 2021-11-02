import { ControlsContact } from '../controls/ControlsContact';
import { ControlsRegression } from '../controls/ControlsRegression';
import { ControlsConstants } from './ControlsConstants';
import { IconSlider } from './IconSlider';
import { Slider } from './Slider';

export class SliderRegression extends Slider {

    static readonly CLASS_CORRECTION_LABEL = 'correction-label';

    constructor(title: string, range: number[]) {

        const container = document.createElement('div');
        container.classList.add('slider-modification');
        document.getElementById('slidersRegressionDiv').appendChild(container);

        const canvasContainer = document.createElement('div');
        canvasContainer.style.width = '240px';
        canvasContainer.style.height = '28px';
        canvasContainer.style.position = 'absolute';
        canvasContainer.style.left = '20px';
        canvasContainer.style.top = '0px';

        container.appendChild(canvasContainer);

        container.addEventListener('pointerup', () => {
            // do something ?
        });

        super({
            container,
            min: Math.min(...range),
            max: Math.max(...range),
            step: 0.01,
            values: [1.0],
            ticks: range.slice(0, -2),
            label: title,
            thumbCreateFunction: (index: number) => {
                return new IconSlider();
            },
            labelFormatFunction: (index, value, type) => {
                if (type === 'tick') {
                    return `${value.toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FIXED)}`;
                } else {
                    return `${value.toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_2)}`;
                }
            },
            handleValueChange: (value, index, type) => {
                if (type === 'stop' || type === 'input') {
                    ControlsRegression.getInstance().handleChange();
                }
            },
            handleThumbPicked: (index) => {
                // nothing
            },
            inputFunctions: {
                inputFormatFunction: (index, value) => {
                    return `${value.toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_2)}`;
                },
                inputHandleFunction: (index, value) => {
                    return parseFloat(value) / 100;
                }
            }
        });

        this.setLabelPosition(13);

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