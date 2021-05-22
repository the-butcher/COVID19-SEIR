import { Slider, ISliderParams } from './Slider';

export class SliderSerialInterval extends Slider {

    constructor(params: ISliderParams) {
        super(params);
    }

    /**
     * override standard behaviour where neighbour sliders can be position on the same value
     * @param index
     * @param value
     * @returns
     */
    valueToAvailableValueSpace(index: number, value: number): number {
        let boundedValue = super.valueToAvailableValueSpace(index, value);
        if (index === 0 && boundedValue > this.getValue(1) - 0.5) {
            boundedValue = this.getValue(1) - 0.5;
        }
        if (index === 1 && boundedValue < this.getValue(0) + 0.5) {
            boundedValue = this.getValue(0) + 0.5;
        }
        return boundedValue;
    }

}