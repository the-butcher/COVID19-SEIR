import { Slider, ISliderParams } from './Slider';

/**
 * subtype of Slider for serial-interval where the two slider cannot have to have some threshold
 *
 * @author h.fleischer
 * @since 22.05.2021
 */
export class SliderSerialInterval extends Slider {

    static readonly THRESHOLD_DAYS = 0.5;

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
        if (index === 0 && boundedValue > this.getValue(1) - SliderSerialInterval.THRESHOLD_DAYS) {
            boundedValue = this.getValue(1) - SliderSerialInterval.THRESHOLD_DAYS;
        }
        if (index === 1 && boundedValue < this.getValue(0) + SliderSerialInterval.THRESHOLD_DAYS) {
            boundedValue = this.getValue(0) + SliderSerialInterval.THRESHOLD_DAYS;
        }
        return boundedValue;
    }

}