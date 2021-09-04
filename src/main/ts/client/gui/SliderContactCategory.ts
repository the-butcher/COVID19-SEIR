import { ContactCategory } from '../../common/demographics/ContactCategory';
import { Demographics } from '../../common/demographics/Demographics';
import { ModificationContact } from '../../common/modification/ModificationContact';
import { ModelConstants } from '../../model/ModelConstants';
import { ControlsContact } from '../controls/ControlsContact';
import { ControlsConstants } from './ControlsConstants';
import { IconSlider } from './IconSlider';
import { Slider } from './Slider';

export class SliderContactCategory extends Slider {

    private readonly contactCategoryConfig: ContactCategory;
    private readonly canvas: HTMLCanvasElement;

    private modification: ModificationContact;

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

        container.appendChild(canvasContainer);

        const ticks = ModelConstants.RANGE____PERCENTAGE_100.slice(0, -1);

        super({
            container,
            min: Math.min(...ModelConstants.RANGE____PERCENTAGE_100),
            max: Math.max(...ModelConstants.RANGE____PERCENTAGE_100),
            step: 0.01, // 100
            values: [1.0],
            ticks,
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

        // <canvas id="weibullCanvas" style="position: absolute; left: 0px; bottom: 0px; width: 100%; height: 100%" />
        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'absolute';
        this.canvas.style.left = '0px';
        this.canvas.style.top = '0px';
        this.canvas.width = 240;
        this.canvas.height = 27;
        canvasContainer.append(this.canvas);

        this.setLabelPosition(13);
        this.contactCategoryConfig = contactCategoryConfig;

        // this.redrawCanvas();

    }

    setValueAndRedraw(index: number, value: number, animated: boolean): void {
        super.setValueAndRedraw(index, value, animated);
        this.redrawCanvas();
    }

    acceptModification(modification: ModificationContact): void {
        this.modification = modification;
        this.redrawCanvas();
    }

    redrawCanvas(): void {

        const context = this.canvas.getContext("2d");
        context.fillStyle = 'rgba(63, 63, 63, 1.00)'; // ControlsConstants.COLORS.CONTACT
        context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const ageGroups = Demographics.getInstance().getAgeGroups();
        const scale = 0.75 * this.getValue();

        const xStp = 240 / ageGroups.length;
        const xPad = 2;



        ageGroups.forEach(ageGroup => {

            context.fillStyle = 'rgba(63, 63, 63, 1.00)';
            if (this.modification.getCorrectionValue(this.contactCategoryConfig.getName(), ageGroup.getIndex()) !== 1) {
                context.fillStyle = 'rgba(255, 63, 63, 1.00)';
            }

            const value = this.contactCategoryConfig.getColumnValue(ageGroup.getIndex());
            const xMin = ageGroup.getIndex() * xStp + xPad;
            const xMax = (ageGroup.getIndex() + 1) * xStp - xPad;
            const yMin = this.canvas.height;
            const yMax = this.canvas.height - value * scale - 1;

            context.beginPath();
            context.moveTo(xMin, yMin); // UL
            context.lineTo(xMin, yMax);
            context.lineTo(xMax, yMax);
            context.lineTo(xMax, yMin);
            context.fill();

        });

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