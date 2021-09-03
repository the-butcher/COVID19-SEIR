import { ContactCategory } from '../../common/demographics/ContactCategory';
import { Demographics } from '../../common/demographics/Demographics';
import { ModelConstants } from '../../model/ModelConstants';
import { ControlsContact } from '../controls/ControlsContact';
import { ControlsConstants } from './ControlsConstants';
import { IconSlider } from './IconSlider';
import { Slider } from './Slider';

export class SliderContactCategory extends Slider {

    private readonly contactCategoryConfig: ContactCategory;

    constructor(contactCategoryConfig: ContactCategory) {

        const container = document.createElement('div');
        container.classList.add('slider-modification');

        document.getElementById('slidersCategoryDiv').appendChild(container);

        const canvasContainer = document.createElement('div');
        canvasContainer.style.width = '240px';
        canvasContainer.style.height = '28px';
        canvasContainer.style.position = 'absolute';
        canvasContainer.style.left = '20px';
        canvasContainer.style.top = '0px';

        // <canvas id="weibullCanvas" style="position: absolute; left: 0px; bottom: 0px; width: 100%; height: 100%" />
        const canvas = document.createElement('canvas');
        canvas.style.position = 'absolute';
        canvas.style.left = '0px';
        canvas.style.top = '0px';
        canvas.width = 240;
        canvas.height = 28;

        const context = canvas.getContext("2d");
        context.fillStyle = 'rgba(131, 202, 13, 0.75)';
        // context.fillRect(0, 0, canvas.width, canvas.height);

        const columnValues: number[] = [];
        Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
            columnValues[ageGroup.getIndex()] = contactCategoryConfig.getColumnValue(ageGroup.getIndex());
        });
        // const maxColumnValue = columnValues.reduce((prev, curr) => Math.max(prev, curr), 0);
        const scale = 0.5;
        const xStep = 240 / (columnValues.length - 1);

        context.beginPath();
        context.moveTo(0, 28);
        for (let i=0; i<columnValues.length; i++) {
            context.lineTo(i * xStep, 28 - columnValues[i] * scale);
        }
        context.lineTo(240, 28);
        context.lineTo(0, 28);
        context.fill();

        container.appendChild(canvasContainer);
        canvasContainer.append(canvas);

        super({
            container,
            min: Math.min(...ModelConstants.RANGE____PERCENTAGE_100),
            max: Math.max(...ModelConstants.RANGE____PERCENTAGE_100),
            step: 0.01, // 100
            values: [1.0],
            ticks: [...ModelConstants.RANGE____PERCENTAGE_100],
            label: contactCategoryConfig.getName(),
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
                    ControlsContact.getInstance().handleChange();
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

        this.contactCategoryConfig = contactCategoryConfig;

    }

    getName(): string {
        return this.contactCategoryConfig.getName();
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