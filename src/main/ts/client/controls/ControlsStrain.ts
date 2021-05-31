import { IModificationValuesStrain } from '../../common/modification/IModificationValuesStrain';
import { ModificationStrain } from '../../common/modification/ModificationStrain';
import { CompartmentChain } from '../../model/compartment/CompartmentChain';
import { ModelConstants } from '../../model/ModelConstants';
import { Color } from '../../util/Color';
import { ObjectUtil } from '../../util/ObjectUtil';
import { StrainUtil } from '../../util/StrainUtil';
import { TimeUtil } from '../../util/TimeUtil';
import { ControlsConstants } from '../gui/ControlsConstants';
import { IconSlider } from '../gui/IconSlider';
import { SliderModification } from '../gui/SliderModification';
import { Slider } from './../gui/Slider';
import { SliderSerialInterval } from './../gui/SliderSerialInterval';
import { Controls } from './Controls';

/**
 * controller for editing contact modifications
 *
 * @author h.fleischer
 * @since 16.05.2021
 */
export class ControlsStrain {

    static getInstance(): ControlsStrain {
        if (ObjectUtil.isEmpty(this.instance)) {
            this.instance = new ControlsStrain();
        }
        return this.instance;
    }
    private static instance: ControlsStrain;

    private readonly sliderReproduction: Slider;
    private readonly sliderSerialInterval: Slider;
    private readonly sliderIncidence: Slider;

    private readonly weibullCanvasContainer = 'weibullCanvas';

    private r0: number;
    private serialInterval: number;
    private intervalScale: number;
    private incidence: number;

    private modification: ModificationStrain;

    constructor() {

        this.sliderReproduction = new Slider({
            container: 'sliderReproductionDiv',
            min: Math.min(...ModelConstants.RANGE______________R0),
            max: Math.max(...ModelConstants.RANGE______________R0),
            step: 0.01,
            values: [1.0],
            ticks: [...ModelConstants.RANGE_SERIAL_INTERVAL],
            label: 'R<sub>0</sub>',
            thumbCreateFunction: (index: number) => {
                return new IconSlider();
            },
            labelFormatFunction: (index, value, type) => {
                if (type === 'tick') {
                    return value.toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FIXED);
                } else {
                    return value.toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_2);
                }
            },
            handleValueChange: (index, value, type) => {
                this.r0 = value;
                this.redrawCanvas();
                if (type === 'stop' || type === 'input') {
                    this.handleChange();
                }
            },
            handleThumbPicked: (index) => {
                // nothing
            },
            inputFunctions: {
                inputFormatFunction: (index, value) => {
                    return `${value.toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_1)}`;
                },
                inputHandleFunction: (index, value) => {
                    return parseFloat(value.replace(',', '.'));
                }
            }
        });

        this.sliderSerialInterval = new SliderSerialInterval({
            container: 'serialIntervalDiv',
            min: Math.min(0),
            max: Math.max(14),
            step: 0.1,
            values: [2.0, 5.0],
            ticks: [...ModelConstants.RANGE_SERIAL_INTERVAL],
            label: 'serial interval',
            thumbCreateFunction: (index: number) => {
                const iconSlider = new IconSlider();
                if (index === 0) {
                    iconSlider.getBulletGroupElement().style.transform = 'scale(0.6)'; // rotate(90deg)
                }
                return iconSlider;
            },
            labelFormatFunction: (index, value, type) => {
                if (type === 'tick') {
                    return value.toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FIXED);
                } else {
                    return value.toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_1);
                }
            },
            handleValueChange: (index, value, type) => {
                 if (index === 0) {
                    this.intervalScale = StrainUtil.calculateIntervalScale(value, this.serialInterval);
                    this.redrawCanvas();
                } else if (index === 1) {
                    this.sliderSerialInterval.setValueAndRedraw(0, StrainUtil.calculateLatency(value, this.intervalScale), false);
                    this.serialInterval = value;
                    this.redrawCanvas();
                }
                if (type === 'stop' || type === 'input') {
                    this.handleChange();
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
                    return parseFloat(value.replace(',', '.'));
                }
            }
        });
        this.sliderSerialInterval.setLabelPosition(13);

        this.sliderIncidence = new Slider({
            container: 'sliderIncidenceDiv',
            min: Math.min(...ModelConstants.RANGE_______INCIDENCE),
            max: Math.max(...ModelConstants.RANGE_______INCIDENCE),
            step: 1.0,
            values: [0.0],
            ticks: [...ModelConstants.RANGE_______INCIDENCE],
            label: 'initial incidence',
            thumbCreateFunction: (index: number) => {
                return new IconSlider();
            },
            labelFormatFunction: (index, value, type) => {
                return value.toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FIXED);
            },
            handleValueChange: (index, value, type) => {
                this.incidence = value;
                if (type === 'stop' || type === 'input') {
                    this.handleChange();
                }
            },
            handleThumbPicked: (index) => {
                // nothing
            },
            inputFunctions: {
                inputFormatFunction: (index, value) => {
                    return `${value.toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FIXED)}`;
                },
                inputHandleFunction: (index, value) => {
                    return parseFloat(value.replace(',', '.'));
                }
            }
        });

        // initial redraw of internal canvas
        this.redrawCanvas();

    }

    acceptModification(modification: ModificationStrain): void {

        Controls.acceptModification(modification);
        this.modification = modification;

        const strain = modification.getModificationValues();

        this.r0 = strain.r0;
        this.serialInterval = strain.serialInterval;
        this.intervalScale = strain.intervalScale;
        this.incidence = strain.incidence;

        this.sliderSerialInterval.setValueAndRedraw(0, StrainUtil.calculateLatency(this.serialInterval, this.intervalScale), true); // = [Strain.calculateLatency(this.serialInterval, this.intervalScale), this.serialInterval];
        this.sliderSerialInterval.setValueAndRedraw(1, this.serialInterval, true);
        this.sliderReproduction.setValueAndRedraw(0, this.r0, true);
        this.sliderIncidence.setValueAndRedraw(0, this.incidence, true);
        this.redrawCanvas();

    }

    handleChange(): void {

        this.modification.acceptUpdate({
            r0: this.r0,
            serialInterval: this.serialInterval,
            intervalScale: this.intervalScale,
            incidence: this.incidence
        });
        SliderModification.getInstance().indicateUpdate(this.modification.getId());

    }

    getMinSerialInterval(): number {
        return Math.min(...ModelConstants.RANGE_SERIAL_INTERVAL);
    }

    getMaxSerialInterval(): number {
        return Math.max(...ModelConstants.RANGE_SERIAL_INTERVAL);
    }

    getSerialInterval(): number {
        return this.serialInterval;
    }

    getIntervalScale(): number {
        return this.intervalScale;
    }

    redrawCanvas(): void {

        // get the canvas
        const weibullCanvas = document.getElementById(this.weibullCanvasContainer) as HTMLCanvasElement;
        const weibullContext = weibullCanvas.getContext("2d");

        // clear the canvas
        weibullCanvas.width = document.getElementById(this.weibullCanvasContainer).offsetWidth;
        weibullCanvas.height = document.getElementById(this.weibullCanvasContainer).offsetHeight;

        weibullContext.fillStyle = "#cccccc";
        weibullContext.clearRect(0, 0, weibullCanvas.width, weibullCanvas.height);
        weibullContext.fillStyle = 'rgba(187, 137, 12, 0.75)'; // ValueSet.COLORS.EXPOSED;

        const toCanvasY = (n: number) =>  weibullCanvas.height - 20 - n;
        const pxPerDay = weibullCanvas.width / (this.sliderSerialInterval.getMaxValue() * TimeUtil.MILLISECONDS_PER____DAY); // one day in pixel

        const strain: IModificationValuesStrain = {
            id: 'temp',
            key: 'STRAIN',
            instant: -1,
            name: 'misc',
            r0: this.r0,
            serialInterval: this.serialInterval,
            intervalScale: this.intervalScale,
            incidence: -1,
            deletable: false,
            draggable: false
        };
        const compartmentParams = CompartmentChain.getInstance().getStrainedCompartmentParams(strain);
        compartmentParams.forEach(compartmentParam => {

            const xMin = compartmentParam.instantA * pxPerDay;
            const xMax = compartmentParam.instantB * pxPerDay;
            const xDim = xMax - xMin;

            const yMin = toCanvasY(0);
            const yDim = compartmentParam.reproduction * 300 / xDim; // TODO magic number
            const yMax = toCanvasY(yDim);

            const hue = compartmentParam.presymptomatic ? 0.94 : 0.83;
            weibullContext.fillStyle = new Color(hue, 0.9, 0.73).getHex(); // 'rgba(218, 14, 223, 0.95)'; // ValueSet.COLORS.INFECTIOUS;
            weibullContext.fillRect(xMin + 0.5, yMin, (xMax - xMin) - 1, Math.min(yMax - yMin, -1));

        });
        const xMinN = compartmentParams[compartmentParams.length-1].instantB * pxPerDay;

        weibullContext.fillStyle = 'rgba(131, 202, 13, 0.75)'; // ValueSet.COLORS.REMOVED;
        weibullContext.fillRect(xMinN + 1, toCanvasY(0), 500, -1);

    }

}