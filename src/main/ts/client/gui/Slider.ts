import { ObjectUtil } from './../../util/ObjectUtil';
import { ASliderElement } from './ASliderElement';
import { IIconSlider } from './IIconSlider';
import { SliderAsset } from './SliderAsset';
import { SliderThumb } from './SliderThumb';
import { SliderTick } from './SliderTick';

export type LABEL__TYPE = 'tick' | 'value' | 'asset';
export type CHANGE_TYPE = 'drag' | 'stop' | 'input' | 'cursor';

/**
 * definition to slider elements that allow manual input
 */
export interface IInputFunctions {
    inputFormatFunction: (index: number, value: number) => string;
    inputHandleFunction: (index: number, value: string) => number;
}

/**
 * definition of a common set of functions for slider elements (formatting of labels, ...)
 */
export interface ISliderFunctions {
    thumbCreateFunction: (index: number) => IIconSlider;
    labelFormatFunction?: (index: number, value: number, type: LABEL__TYPE) => string;
    inputFunctions?: IInputFunctions;
}

/**
 * definition for the set of values needed to construct an instance of Slider
 */
export interface ISliderParams extends ISliderFunctions {
    container: string | HTMLDivElement;
    min: number,
    max: number,
    step: number;
    values: number[];
    ticks: number[];
    label: string,
    handleValueChange: (index: number, value: number, type: CHANGE_TYPE) => void;
    handleThumbPicked: (index: number) => void;
}

/**
 * base definition for a set of parameters needed to construct a single slider element
 */
export interface ISliderElementParams {
    type: LABEL__TYPE,
    value: number;
    index: number;
    labelFormatFunction?: (index: number, value: number, type: LABEL__TYPE) => string;
    containerClass: string;
    labelContainerClass: string;
}

export interface ISliderThumbParams extends ISliderElementParams, ISliderFunctions {
    draggable: boolean;
}

export interface ISliderAssetParams extends ISliderElementParams {
    thumbCreateFunction: (index: number) => IIconSlider;
}



/**
 * generic implementation of a horizontal slider
 *
 * @author h.fleischer
 * @since 13.05.2021
 */
export class Slider {

    static readonly Y_OFFSET_THUMB = 8;

    private static TAB_INDEX = 100; // start with a generous offset
    private static Z___INDEX = 100; // start with a generous offset

    static readonly CLASS_SLIDER_CONTAINER = 'slider-container';
    static readonly CLASS_SLIDER_____TRACK = 'slider-track';
    static readonly CLASS_TRACK______LABEL = 'track-label';
    static readonly CLASS_TICK___CONTAINER = 'tick-container';
    static readonly CLASS_TICK________LINE = 'tick-line';
    static readonly CLASS_TICK_______LABEL = 'tick-label';
    static readonly CLASS_THUMB__CONTAINER = 'thumb-container';
    static readonly CLASS_THUMB____CONTENT = 'thumb-content';
    static readonly CLASS_THUMB______LABEL = 'thumb-label';
    static readonly CLASS_THUMB_EDIT_LABEL = 'thumb-edit-label';
    static readonly CLASS_THUMB______INPUT = 'thumb-input';

    private readonly sliderContainer: HTMLDivElement;
    private readonly trackElement: HTMLDivElement;
    private readonly trackElement1: HTMLDivElement;
    private readonly trackElement2: HTMLDivElement;
    private readonly trackLabelElement: HTMLDivElement;

    private readonly sliderTicks: SliderTick[];
    private readonly sliderThumbs: SliderThumb[];
    private readonly sliderAssets: SliderAsset[];

    private readonly handleValueChange: (index: number, value: number, type: CHANGE_TYPE) => void;
    protected readonly handleThumbPicked: (index: number) => void;

    private creatorThumb: SliderThumb;

    /**
     * mouse is over the slider
     */
    protected mouseOverModificationSlider = 0;
    private creatorVisNeighbour = 0;

    private focusableThumbIndex: number;
    private draggableThumbIndex: number;
    private clickableThumbIndex: number;

    private readonly inputEnabled: boolean;

    private dragOffset: number
    private minValue: number;
    private maxValue: number;
    private readonly tickParams: ISliderFunctions;
    private readonly step: number;

    private disabled: boolean;

    constructor(params: ISliderParams) {

        this.sliderTicks = [];
        this.sliderThumbs = [];
        this.sliderAssets = [];
        this.draggableThumbIndex = -1;
        this.clickableThumbIndex = -1;
        this.focusableThumbIndex = -1;
        this.dragOffset  = 0;
        this.minValue = params.min;
        this.maxValue = params.max;
        this.tickParams = params;
        this.step = params.step;
        this.disabled = false;

        this.handleValueChange = params.handleValueChange;
        this.handleThumbPicked = params.handleThumbPicked;

        this.sliderContainer = params.container instanceof HTMLDivElement ? params.container : document.getElementById(params.container) as HTMLDivElement;
        this.sliderContainer.classList.add(Slider.CLASS_SLIDER_CONTAINER);

        this.trackElement = document.createElement('div');
        this.trackElement.classList.add(Slider.CLASS_SLIDER_____TRACK);
        this.sliderContainer.appendChild(this.trackElement);

        // left part of the track (when used for indicating progress)
        this.trackElement1 = document.createElement('div');
        this.trackElement1.classList.add(Slider.CLASS_SLIDER_____TRACK);
        this.trackElement1.style.width = '100%';
        this.trackElement1.style.position = 'absolute';
        this.trackElement.appendChild(this.trackElement1);

        // right part of the track (when used for indicating progress)
        this.trackElement2 = document.createElement('div');
        this.trackElement2.classList.add(Slider.CLASS_SLIDER_____TRACK);
        this.trackElement2.style.width = '0%';
        this.trackElement2.style.position = 'absolute';
        this.trackElement2.style.backgroundColor = 'var(--color-text)';
        this.trackElement.appendChild(this.trackElement2);

        this.trackLabelElement = document.createElement('div');
        this.trackLabelElement.classList.add(Slider.CLASS_TRACK______LABEL);
        this.trackLabelElement.innerHTML = params.label;
        this.trackElement.appendChild(this.trackLabelElement);

        /**
         * construct slider ticks
         */
        for (let index = 0; index < params.ticks.length; index++) {
            const sliderTick = this.createTick(params.ticks[index], index);
            this.addTick(sliderTick);
        };

        /**
         * wrap any input function so it auto clamps values to min / max
         */
        const thumbParams = {...params};
        if (params.inputFunctions) {
            this.inputEnabled = true;
            thumbParams.inputFunctions = {
                inputFormatFunction: params.inputFunctions.inputFormatFunction,
                inputHandleFunction: (index, inputValue) => {

                    let value = params.inputFunctions.inputHandleFunction(index, inputValue.replace(',', '.')); // sanitize input
                    value = this.valueToAvailableValueSpace(index, value); // don't drag across neighbour sliders

                    this.setValueAndRedraw(index, value, true);
                    params.handleValueChange(index, value, 'input'); // should be params

                    return value;

                }
            }
        } else {
            this.inputEnabled = false;
        }

        // construct initial set of thumbs
        for (let index = 0; index < params.values.length; index++) {
            const sliderThumb = this.createThumb(params.values[index], index, ObjectUtil.createId(), true, thumbParams);
            this.addThumb(sliderThumb);
        }

        // execute drag (if there is a draggableIndex >= 0)
        document.addEventListener('pointermove', e => {
            this.handlePointerMove(e);
        });

        // terminate drag
        document.addEventListener('pointerup', e => {
            this.handlePointerUp(e);
        });

        // reposition all elements along the slider
        window.addEventListener('resize', e => {
            this.handleResize();
        });

        let timeoutOut = -1;
        // entering the create area
        this.getContainer().addEventListener('pointerover', e => {
            window.clearTimeout(timeoutOut);
            this.mouseOverModificationSlider = 1;
        });

        // exiting the create area
        this.getContainer().addEventListener('pointerout', () => {
            timeoutOut = window.setTimeout(() => {
                this.mouseOverModificationSlider = 0;
            }, 25);
        });

        let keyupTimeout = -1;
        let keyupRequire = false;
        window.addEventListener('keydown', e => {

            if (this.disabled) {
                return;
            }

            if (this.focusableThumbIndex >= 0 && this.sliderThumbs[this.focusableThumbIndex].isDraggable()) {
                window.clearTimeout(keyupTimeout);
                let value = this.getValue(this.focusableThumbIndex);
                if (e.key === 'ArrowLeft') {
                    value -= params.step;
                } else if (e.key === 'ArrowRight') {
                    value += params.step;
                }
                value = this.valueToAvailableValueSpace(this.focusableThumbIndex, value);
                if (value !== this.getValue(this.focusableThumbIndex)) {
                    keyupRequire = true;
                    this.setValueAndRedraw(this.focusableThumbIndex, value, false);
                    this.handleValueChange(this.focusableThumbIndex, this.getValue(this.focusableThumbIndex), 'cursor');
                }
            }

        });

        window.addEventListener('keyup', e => {

            if (this.disabled) {
                return;
            }

            if (this.focusableThumbIndex >= 0 && keyupRequire && this.sliderThumbs[this.focusableThumbIndex].isDraggable()) {
                keyupRequire = false;
                keyupTimeout = window.setTimeout(() => {
                    this.handleValueChange(this.focusableThumbIndex, this.getValue(this.focusableThumbIndex), 'stop');
                }, 500);
            }

        });

    }

    // getTickValues(): number[] {
    //     return this.sliderTicks.map(t => t.getValue());
    // }

    setRange(range: number[]): void {

        this.minValue = Math.min(...range);
        this.maxValue = Math.max(...range);
        this.clearTicks();
        for (let index = 0; index < range.length; index++) {
            const sliderTick = this.createTick(range[index], index);
            this.addTick(sliderTick);
        };
        this.handleResize();

    }

    setProgress(progress: number): void {
        if (progress > 0) {
            this.trackElement1.style.width = `${(1 - progress) * 100}%`;
            this.trackElement2.style.width = `${progress * 100}%`;
        } else {
            this.trackElement1.style.width = '100%';
            this.trackElement2.style.width = '0%';
        }
    }

    /**
     * find a specific thumb having the given id
     *
     * @param id
     * @returns
     */
    findThumbById(id: string): SliderThumb {
        return this.sliderThumbs.find(sliderThumb => sliderThumb.getId() === id);
    }

    clearTicks(): void {
        this.sliderTicks.forEach(sliderTick => {
            this.sliderContainer.removeChild(sliderTick.getContainer());
        });
        this.sliderTicks.length = 0;
    }

    clearThumbs(): void {
        this.sliderThumbs.forEach(sliderThumb => {
            this.sliderContainer.removeChild(sliderThumb.getContainer());
        });
        if (this.creatorThumb) {
            this.sliderContainer.removeChild(this.creatorThumb.getContainer());
        }
        this.creatorThumb = undefined;
        this.sliderThumbs.length = 0;
    }

    clearAssets(): void {
        this.sliderAssets.forEach(sliderAsset => {
            this.sliderContainer.removeChild(sliderAsset.getContainer());
        });
        this.sliderAssets.length = 0;
    }

    /**
     * creates a single tick ready to be added to the slider
     * @param value
     * @param index
     * @param params
     */
    createTick(value: number, index: number): SliderTick {
        const sliderTick = new SliderTick({
            type: 'tick',
            value,
            index,
            labelFormatFunction: this.tickParams.labelFormatFunction,
            containerClass: Slider.CLASS_TICK___CONTAINER,
            labelContainerClass: Slider.CLASS_TICK_______LABEL
        });
        return sliderTick;
    }

    createAsset(value: number, index: number, params: ISliderFunctions): SliderTick {
        const sliderAsset = new SliderAsset({
            type: 'asset',
            value,
            index,
            thumbCreateFunction: params.thumbCreateFunction,
            containerClass: Slider.CLASS_THUMB__CONTAINER,
            labelContainerClass: Slider.CLASS_THUMB______LABEL,
        });
        return sliderAsset;
    }

    /**
     * creates a single thumb ready to be added to the slider
     * @param value
     * @param index
     * @param params
     */
    createThumb(value: number, index: number, id: string, draggable: boolean, params: ISliderFunctions): SliderThumb {

        const sliderThumb = new SliderThumb(id, {
            type: 'value',
            value,
            index,
            thumbCreateFunction: params.thumbCreateFunction,
            labelFormatFunction: params.labelFormatFunction,
            inputFunctions: params.inputFunctions,
            containerClass: Slider.CLASS_THUMB__CONTAINER,
            labelContainerClass: Slider.CLASS_THUMB______LABEL,
            draggable
        });

        if (draggable) {
            sliderThumb.getContainer().addEventListener('pointerdown', e => {
                sliderThumb.getContainer().style.transition = '';
                this.handlePointerDown(index, e);
            });
        }

        sliderThumb.getThumbContentContainer().tabIndex = Slider.TAB_INDEX++;
        sliderThumb.getThumbContentContainer().addEventListener('focus', () => {
            this.focusableThumbIndex = index;
            sliderThumb.setFocussed(true);
            sliderThumb.getContainer().style.zIndex = `${Slider.Z___INDEX++}`;
            this.handleThumbPicked(index);
        });
        sliderThumb.getThumbContentContainer().addEventListener('blur', () => {
            this.focusableThumbIndex = -1;
            sliderThumb.setFocussed(false);
        });

        return sliderThumb;

    }

    setCreatorThumb(creatorThumb: SliderThumb): void {
        this.creatorThumb = creatorThumb;
        this.sliderContainer.appendChild(this.creatorThumb.getContainer());
    }

    addTick(sliderTick: SliderTick): void {
        this.sliderTicks.push(sliderTick);
        this.sliderContainer.appendChild(sliderTick.getContainer());
        requestAnimationFrame(() => { // detached call to allow dom elements to settle
            this.redrawSliderElement(sliderTick, 35, false);
        });
    }

    addAsset(sliderAsset: SliderAsset): void {
        this.sliderAssets.push(sliderAsset);
        this.sliderContainer.appendChild(sliderAsset.getContainer());
        requestAnimationFrame(() => { // detached call to allow dom elements to settle
            this.redrawSliderElement(sliderAsset, Slider.Y_OFFSET_THUMB, false);
        });
    }

    addThumb(sliderThumb: SliderThumb): void {
        this.sliderThumbs.push(sliderThumb);
        this.sliderContainer.appendChild(sliderThumb.getContainer());
        requestAnimationFrame(() => { // detached call to allow dom elements to settle
            this.redrawSliderElement(sliderThumb, Slider.Y_OFFSET_THUMB, false);
        });
    }

    /**
     * be sure not to drag sliders across each others
     * @param value
     * @param index
     * @returns
     */
    valueToAvailableValueSpace(index: number, value: number): number {
        let minValue = this.minValue;
        let maxValue = this.maxValue;
        if (index > 0) {
            minValue = this.getValue(index - 1);
        }
        if (index < this.sliderThumbs.length - 1) {
            maxValue = this.getValue(index + 1);
        }
        return this.valueToStep(Math.max(minValue, Math.min(maxValue, value))); // clamp to range
    }

    valueToStep(value: number): number {
        return Math.round(value / this.step) * this.step; // round to specified steps
    }

    redrawSliderElement(sliderElement: ASliderElement, topOffset: number, animated: boolean): void {
        const trackBounds = this.trackElement.getBoundingClientRect();
        const ratio = (sliderElement.getValue() - this.minValue) / (this.maxValue - this.minValue);
        const elementContainer = sliderElement.getContainer();
        elementContainer.style.transition = animated ? 'transform 250ms ease-in-out' : '';
        elementContainer.style.transform = `translate(${trackBounds.width * ratio - elementContainer.offsetWidth / 2}px, ${topOffset}px)`;
        if (ratio >= 0 && ratio <= 1) {
            elementContainer.style.visibility = 'visible';
        } else {
            elementContainer.style.visibility = 'hidden';
        }
    }

    /**
     * start a drag
     * @param index
     * @param e
     */
    handlePointerDown(index: number, e: PointerEvent): void {

        this.clickableThumbIndex = index;
        if (this.sliderThumbs[index].isDraggable()) {
            this.draggableThumbIndex = index;
            this.dragOffset =  e.clientX - this.sliderThumbs[index].getContainer().getBoundingClientRect().left - this.sliderThumbs[index].getContainer().getBoundingClientRect().width / 2;
        }
        // this.handleThumbPicked(index);

    }

    /**
     * calculate a position along the track element for the given PointerEvent
     * the resulting value is not clamped to track element boundaries and can contain excess value that need to be trimmed
     * @param e
     * @returns
     */
    eventToPosition(e: PointerEvent | MouseEvent): number {
        return e.clientX - this.trackElement.getBoundingClientRect().left - this.dragOffset; // transform event into track space
    }

    handlePointerMove(e: PointerEvent): void {

        if (this.disabled) {
            return;
        }

        const position = this.eventToPosition(e);
        let value = this.positionToValue(position); // transform into value space and clamp to slider bounds
        // value = this.valueToStep(value);
        if (this.draggableThumbIndex >= 0 && value !== this.getValue(this.draggableThumbIndex)) {

            this.clickableThumbIndex = -1; // reset upon move, so a pointerup can be treated as move after that time

            value = this.valueToAvailableValueSpace(this.draggableThumbIndex, value);
            this.setValueAndRedraw(this.draggableThumbIndex, value, false);
            this.handleValueChange(this.draggableThumbIndex, this.getValue(this.draggableThumbIndex), 'drag');

        }

        if (this.creatorThumb) {

            this.creatorVisNeighbour = 1;
            this.sliderThumbs.forEach(sliderThumb => {
                const thumbOffset = position - this.valueToPosition(sliderThumb.getValue());
                if (thumbOffset > -20 && thumbOffset < 20) {
                    this.creatorVisNeighbour = 0;
                }
            });
            const creatorVis = this.creatorVisNeighbour * this.mouseOverModificationSlider;
            this.creatorThumb.getContainer().style.opacity = `${this.creatorVisNeighbour * this.mouseOverModificationSlider}`;
            if (creatorVis) {
                this.creatorThumb.setValue(value); // just place the creator thumb, don't enforce neighbour thumb values
                this.redrawSliderElement(this.creatorThumb, Slider.Y_OFFSET_THUMB, false);
            }

        }

    }

    /**
     * handle a pointerup anywhere in the document
     */
     handlePointerUp(e: PointerEvent): void {

        if (this.disabled) {
            return;
        }

        if (this.clickableThumbIndex >= 0) {

            // console.log('clicked');
            if (this.inputEnabled && e.target === this.sliderThumbs[this.clickableThumbIndex].getLabelContainer()) {
                this.sliderThumbs[this.clickableThumbIndex].displayInput();
            } else {
                this.handleThumbPicked(this.clickableThumbIndex); // pick this specific thumb
            }

        } else if (this.draggableThumbIndex >= 0) {

            this.handleValueChange(this.draggableThumbIndex, this.getValue(this.draggableThumbIndex), 'stop');
            this.handleThumbPicked(this.draggableThumbIndex);

        }

        this.clickableThumbIndex = -1;
        this.draggableThumbIndex = -1;
        this.dragOffset = 0;

    }

    /**
     * get the outer container of this slider
     * @returns
     */
    getContainer(): HTMLDivElement {
        return this.sliderContainer;
    }

    setLabel(label: string): void {
        this.trackLabelElement.innerHTML = label;
    }

    setLabelPosition(y: number): void {
        this.trackLabelElement.style.top = `${y}px`;
    }

    /**
     * transform a position 0-trackElement.clientWidth to value space
     * @param position
     * @returns
     */
    positionToValue(position: number): number {
        const maxPosition = this.trackElement.clientWidth;
        if (position < 0) {
            return this.minValue;
        } else if (position > maxPosition) {
            return this.maxValue;
        } else {
            const ratio = position / this.trackElement.clientWidth;
            const value = (this.minValue + ratio * (this.maxValue - this.minValue));
            return this.valueToStep(value);
        }
    }

    valueToPosition(instant: number): number {
        const ratio = (instant - this.minValue) / (this.maxValue - this.minValue);
        const maxPosition = this.trackElement.clientWidth;
        const position = maxPosition * ratio;
        if (position < 0) {
            return 0;
        } else if (position > maxPosition) {
            return maxPosition;
        } else {
            return position;
        }
    }

    setDisabled(disabled: boolean): void {
        this.sliderContainer.style.opacity = disabled ? '0.5' : '1.0';
        this.sliderThumbs.forEach(sliderThumb => {
            sliderThumb.setDisabled(disabled);
        })
        this.disabled = disabled;
    }

    /**
     * all elements need to be repositioned on resize
     */
    handleResize(): void {
        this.sliderTicks.forEach(tickElement => {
            this.redrawSliderElement(tickElement, 35, true);
        });
        this.sliderAssets.forEach(assetElement => {
            this.redrawSliderElement(assetElement, Slider.Y_OFFSET_THUMB, true);
        });
        this.sliderThumbs.forEach(thumbElement => {
            this.redrawSliderElement(thumbElement, Slider.Y_OFFSET_THUMB, true);
        });
    }

    protected getSliderThumbs(): SliderThumb[] {
        return this.sliderThumbs;
    }

    getMinValue(): number {
        return this.minValue;
    }

    getMaxValue(): number {
        return this.maxValue;
    }

    getValue(index: number): number {
        return this.sliderThumbs[index].getValue();
    }

    setValueAndRedraw(index: number, value: number, animated: boolean): void {
        this.sliderThumbs[index].setValue(value);
        this.redrawSliderElement(this.sliderThumbs[index], Slider.Y_OFFSET_THUMB, animated);
    }

}