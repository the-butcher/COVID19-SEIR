import { ISliderElementParams, LABEL__TYPE } from './Slider';

/**
 * definition for types aligned along a horizontal slider
 *
 * @author h.fleischer
 * @since 13.05.2021
 */
export abstract class ASliderElement {

    private type: LABEL__TYPE;
    private value: number;
    private index: number;
    private readonly container: HTMLDivElement;
    private readonly labelContainer: HTMLDivElement;
    private labelFormatFunction: (index: number, value: number, type: LABEL__TYPE) => string;

    constructor(params: ISliderElementParams) {

        this.type = params.type;
        this.index = params.index;
        this.labelFormatFunction = params.labelFormatFunction;

        this.container = document.createElement('div');
        this.container.classList.add(params.containerClass);
        this.container.style.transition = 'opacity 250ms ease-in-out';

        this.labelContainer = document.createElement('div');
        this.labelContainer.classList.add(params.labelContainerClass);
        this.container.appendChild(this.labelContainer);

        this.setValue(params.value);

    }
    /**
     * get this elements value (must be withing min/max space of the containing slider)
     */
    getValue(): number {
        return this.value;
    }

    getIndex(): number {
        return this.index;
    }

    /**
     * update the elements value
     * @param value
     */
    setValue(value: number): void {
        this.value = value;
        if (this.labelFormatFunction) {
            this.labelContainer.innerHTML = this.labelFormatFunction(this.index, this.value, this.type);
        }
    }

    setFractionDigits(fractionDigits: number): void {
        const numberFormat = {
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits
        };
        this.labelFormatFunction = (index, value, type) => {
            return value.toLocaleString(undefined, numberFormat);
        };
    }

    /**
     * get the outermost container of this element
     */
    getContainer(): HTMLDivElement {
        return this.container;
    }

    getLabelContainer(): HTMLDivElement {
        return this.labelContainer;
    }

}