import { ASliderElement } from './ASliderElement';
import { IIconSlider } from './IIconSlider';
import { ISliderThumbParams, Slider } from './Slider';

/**
 * wrapper class around a thumb element along a horizontal slider
 *
 * @author h.fleischer
 * @since 16.05.2021
 */
export class SliderThumb extends ASliderElement {

    private readonly id: string;
    private readonly icon: IIconSlider;
    private readonly thumbContentContainer: HTMLDivElement;
    private readonly thumbInputContainer: HTMLInputElement;
    private draggable: boolean;
    private readonly inputFormatFunction: (index: number, value: number) => string;
    private readonly inputHandleFunction: (index: number, value: string) => number;

    constructor(id: string, params: ISliderThumbParams) {

        super(params);

        this.id = id;
        this.draggable = params.draggable;

        if (params.inputFunctions) {

            this.inputHandleFunction = params.inputFunctions.inputHandleFunction;
            this.inputFormatFunction = params.inputFunctions.inputFormatFunction;

            this.thumbInputContainer = document.createElement('input');
            this.thumbInputContainer.classList.add(Slider.CLASS_THUMB______INPUT);
            this.thumbInputContainer.style.display = 'none';
            this.getContainer().appendChild(this.thumbInputContainer);

            // adds the hover-underline
            this.getLabelContainer().classList.add(Slider.CLASS_THUMB_EDIT_LABEL);

            this.thumbInputContainer.addEventListener('blur', e => {
                this.commitInput();
            });
            this.thumbInputContainer.addEventListener('keyup', e => {
                if (e.key === 'Enter') {
                    this.commitInput();
                }
            });

        }

        /**
         * the content of the slider thumb (likely an icon)
         */
        this.thumbContentContainer = document.createElement('div');
        this.thumbContentContainer.classList.add(Slider.CLASS_THUMB____CONTENT);
        this.getContainer().appendChild(this.thumbContentContainer);

        /**
         * create thumb content and append to thumb
         */
        this.icon = params.thumbCreateFunction(params.index);
        this.thumbContentContainer.appendChild(this.icon.getSvgContainer());

        /**
         * cursor styles for dragging
         */
        if (this.draggable) {
            this.thumbContentContainer.style.cursor = 'grab';
            this.thumbContentContainer.addEventListener('pointerdown', e => {
                this.thumbContentContainer.style.cursor = 'grabbing';
            });
            document.body.addEventListener('pointerup', e => {
                this.thumbContentContainer.style.cursor = 'grab';
            });
        }

    }

    getId(): string {
        return this.id;
    }

    setFocussed(focussed: boolean): void {
        this.icon.setFocussed(focussed);
    }

    getThumbContentContainer(): HTMLDivElement {
        return this.thumbContentContainer;
    }

    displayInput(): void {
        this.draggable = false;
        this.thumbInputContainer.style.width = `${this.getLabelContainer().offsetWidth}px`;
        this.getLabelContainer().style.display = 'none';
        this.thumbInputContainer.style.display = 'inline-block';
        this.thumbInputContainer.value = this.inputFormatFunction(this.getIndex(), this.getValue());
        this.thumbInputContainer.focus();
        this.thumbInputContainer.select(); // select the content of the input
    }

    commitInput(): void {
        this.draggable = true;
        this.getLabelContainer().style.display = 'inline-block';
        this.thumbInputContainer.style.display = 'none';
        this.inputHandleFunction(this.getIndex(), this.thumbInputContainer.value);
    };

    isDraggable(): boolean {
        return this.draggable;
    }

}