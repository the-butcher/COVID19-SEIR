import { thisExpression } from '@babel/types';
import { IModificationValuesStrain } from '../../common/modification/IModificationValuesStrain';
import { ModificationResolverStrain } from '../../common/modification/ModificationResolverStrain';
import { ModificationStrain } from '../../common/modification/ModificationStrain';
import { CompartmentChainRecovery } from '../../model/compartment/CompartmentChainRecovery';
import { CompartmentChainReproduction } from '../../model/compartment/CompartmentChainReproduction';
import { ModelConstants } from '../../model/ModelConstants';
import { Color } from '../../util/Color';
import { ObjectUtil } from '../../util/ObjectUtil';
import { StrainUtil } from '../../util/StrainUtil';
import { TimeUtil } from '../../util/TimeUtil';
import { ChartDiscoveryRate } from '../chart/ChartDiscoveryRate';
import { ControlsConstants, HUE_____EXPOSED } from '../gui/ControlsConstants';
import { IconSlider } from '../gui/IconSlider';
import { SliderModification } from '../gui/SliderModification';
import { SliderSetting } from '../gui/SliderSetting';
import { StorageUtil } from '../storage/StorageUtil';
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
    private readonly sliderImmuneEscape: Slider;
    private readonly sliderTimeToWane: Slider;

    private readonly slidersStrainEscape: { [K in string]: Slider };

    private readonly weibullCanvasReproductionContainer = 'weibullCanvasReproduction';
    private readonly weibullCanvasRecoveryContainer = 'weibullCanvasRecovery';

    private r0: number;
    private serialInterval: number;
    private intervalScale: number;
    private incidence: number;
    private immuneEscape: number;
    private strainEscape: { [K in string]: number };

    private timeToWane: number;

    private modification: ModificationStrain;

    constructor() {

        this.sliderReproduction = new Slider({
            container: 'sliderReproductionDiv',
            min: Math.min(...ModelConstants.RANGE________________R0),
            max: Math.max(...ModelConstants.RANGE________________R0),
            step: 0.01,
            values: [0.0],
            ticks: [...ModelConstants.RANGE___SERIAL_INTERVAL],
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
                this.redrawCanvasReproduction();
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
            ticks: [...ModelConstants.RANGE___SERIAL_INTERVAL],
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
                    this.redrawCanvasReproduction();
                } else if (index === 1) {
                    this.sliderSerialInterval.setValueAndRedraw(0, StrainUtil.calculateLatency(value, this.intervalScale), false);
                    this.serialInterval = value;
                    this.redrawCanvasReproduction();
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
            min: Math.min(...ModelConstants.RANGE____INCIDENCE_1000),
            max: Math.max(...ModelConstants.RANGE____INCIDENCE_1000),
            step: 1.0,
            values: [0.0],
            ticks: [...ModelConstants.RANGE____INCIDENCE_1000],
            label: 'initial incidence',
            thumbCreateFunction: (index: number) => {
                return new IconSlider();
            },
            labelFormatFunction: (index, value, type) => {
                return value.toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_2);
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

        const container = document.createElement('div');
        this.sliderImmuneEscape = new Slider({
            container,
            min: Math.min(...ModelConstants.RANGE____PERCENTAGE_100),
            max: Math.max(...ModelConstants.RANGE____PERCENTAGE_100),
            step: 0.01,
            values: [0.0],
            ticks: [...ModelConstants.RANGE____PERCENTAGE_100],
            label: 'immune escape',
            thumbCreateFunction: (index: number) => {
                return new IconSlider();
            },
            labelFormatFunction: (index, value, type) => {
                return `${(value * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FIXED)}%`;
            },
            handleValueChange: (index, value, type) => {
                this.immuneEscape = value;
                if (type === 'stop' || type === 'input') {
                    this.handleChange();
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
                    return parseFloat(value.replace(',', '.')) / 100;
                }
            }
        });
        document.getElementById('sliderImmuneEscapeDiv').appendChild(container);

        this.slidersStrainEscape = {};
        new ModificationResolverStrain().getModifications().forEach(strain => {
            const container = document.createElement('div');
            const slider = new Slider({
                container,
                min: Math.min(...ModelConstants.RANGE____PERCENTAGE_100),
                max: Math.max(...ModelConstants.RANGE____PERCENTAGE_100),
                step: 0.01,
                values: [0.0],
                ticks: [...ModelConstants.RANGE____PERCENTAGE_100],
                label: `${strain.getName()} escape`,
                thumbCreateFunction: (index: number) => {
                    return new IconSlider();
                },
                labelFormatFunction: (index, value, type) => {
                    return `${(value * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FIXED)}%`;
                },
                handleValueChange: (index, value, type) => {
                    this.strainEscape[strain.getId()] = value;
                    if (type === 'stop' || type === 'input') {
                        this.handleChange();
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
                        return parseFloat(value.replace(',', '.')) / 100;
                    }
                }
            });
            document.getElementById('sliderImmuneEscapeDiv').appendChild(container);
            // slider.getContainer().style.height = '60px';
            this.slidersStrainEscape[strain.getId()] = slider;
        });

        this.sliderTimeToWane = new Slider({
            container: 'sliderTimeToWaneDiv',
            min: Math.min(...ModelConstants.RANGE________REEXPOSURE),
            max: Math.max(...ModelConstants.RANGE________REEXPOSURE),
            step: 0.1,
            values: [3.0],
            ticks: [1, 2, 3, 4],
            label: 'immunity (months)',
            thumbCreateFunction: (index: number) => {
                return new IconSlider();
            },
            labelFormatFunction: (index, value, type) => {
                if (type === 'tick') {
                    return value.toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FIXED);
                } else {
                    return value.toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_1);
                }
            },
            handleValueChange: (index, value, type) => {
                this.timeToWane = value;
                this.redrawCanvasRecovery();
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
        this.sliderTimeToWane.setLabelPosition(13);

        this.strainEscape = {};
        new ModificationResolverStrain().getModifications().forEach(strain => {
            this.strainEscape[strain.getId()] = 0;
        });

        // initial redraw of internal canvas
        this.redrawCanvasReproduction();
        this.redrawCanvasRecovery();

    }

    acceptModification(modification: ModificationStrain): void {

        Controls.acceptModification(modification);
        this.modification = modification;

        if (this.modification.isPrimary()) {
            this.sliderIncidence.setRange(ModelConstants.RANGE____INCIDENCE_1000);
        } else {
            this.sliderIncidence.setRange(ModelConstants.RANGE_____INCIDENCE__10);
        }

        const strain = modification.getModificationValues();


        this.r0 = strain.r0;

        this.serialInterval = strain.serialInterval;
        this.intervalScale = strain.intervalScale;
        this.incidence = strain.dstIncidence;

        this.immuneEscape = strain.immuneEscape || 0.0;

        Object.keys(this.slidersStrainEscape).forEach(key => {
            this.strainEscape[key] = modification.getStrainEscape(key) || 0;
        });

        this.timeToWane = strain.timeToWane || 3; // months

        const log = Math.log10(this.incidence);
        const minR0 = Math.pow(10, Math.floor(log - 1));
        const maxR0 = Math.pow(10, Math.floor(log + 1));
        // const stepR0 = minR0; // Math.pow(10, Math.round(log));
        // console.log(this.incidence, Math.round(Math.log10(this.incidence)), minR0, maxR0, stepR0);

        if (log < 0) {
            this.sliderIncidence.setFractionDigits(2 - log);
        } else {
            this.sliderIncidence.setFractionDigits(0);
        }
        this.sliderIncidence.setStep(minR0);
        this.sliderIncidence.setRange([minR0, maxR0]);

        this.sliderSerialInterval.setValueAndRedraw(0, StrainUtil.calculateLatency(this.serialInterval, this.intervalScale), true); // = [Strain.calculateLatency(this.serialInterval, this.intervalScale), this.serialInterval];
        this.sliderSerialInterval.setValueAndRedraw(1, this.serialInterval, true);
        this.sliderReproduction.setValueAndRedraw(0, this.r0, true);
        this.sliderIncidence.setValueAndRedraw(0, this.incidence, true);
        this.sliderImmuneEscape.setValueAndRedraw(0, this.immuneEscape, true);
        this.sliderTimeToWane.setValueAndRedraw(0, this.timeToWane, true);
        Object.keys(this.slidersStrainEscape).forEach(key => {
            this.slidersStrainEscape[key].setValueAndRedraw(0, this.strainEscape[key], true);
        });

        requestAnimationFrame(() => {
            this.sliderIncidence.handleResize();
            this.sliderReproduction.handleResize();
            this.sliderImmuneEscape.handleResize();
            Object.keys(this.slidersStrainEscape).forEach(key => {
                this.slidersStrainEscape[key].handleResize();
            });
            this.sliderTimeToWane.handleResize();
            this.sliderIncidence.setDisabled(modification.isPrimary());
        });

        this.redrawCanvasReproduction();
        this.redrawCanvasRecovery();
        // this.updateChart();

    }

    handleChange(): void {

        // console.log('this.strainEscape', this.strainEscape);

        this.modification.acceptUpdate({
            r0: this.r0,
            serialInterval: this.serialInterval,
            intervalScale: this.intervalScale,
            dstIncidence: this.incidence,
            immuneEscape: this.immuneEscape,
            strainEscape: { ...this.strainEscape },
            timeToWane: this.timeToWane,
        });

        SliderModification.getInstance().indicateUpdate(this.modification.getId());
        StorageUtil.getInstance().setSaveRequired(true);
        ControlsConstants.MODIFICATION_PARAMS[this.modification.getKey()].handleModificationUpdate(); // update model after modification update

    }

    getMinSerialInterval(): number {
        return Math.min(...ModelConstants.RANGE___SERIAL_INTERVAL);
    }

    getMaxSerialInterval(): number {
        return Math.max(...ModelConstants.RANGE___SERIAL_INTERVAL);
    }

    getSerialInterval(): number {
        return this.serialInterval;
    }

    getIntervalScale(): number {
        return this.intervalScale;
    }

    redrawCanvasRecovery(): void {

        // get the canvas
        const weibullCanvas = document.getElementById(this.weibullCanvasRecoveryContainer) as HTMLCanvasElement;
        const weibullContext = weibullCanvas.getContext("2d");

        // clear the canvas
        weibullCanvas.width = document.getElementById(this.weibullCanvasRecoveryContainer).offsetWidth;
        weibullCanvas.height = document.getElementById(this.weibullCanvasRecoveryContainer).offsetHeight;

        weibullContext.fillStyle = "#cccccc";
        weibullContext.clearRect(0, 0, weibullCanvas.width, weibullCanvas.height);

        const toCanvasY = (n: number) => weibullCanvas.height - 20 - n;
        const pxPerMilli = weibullCanvas.width / (this.sliderTimeToWane.getMaxValue() * TimeUtil.MILLISECONDS_PER____DAY * 30); // one month in pixel

        // console.log('pxPerMonth', pxPerMilli);

        const compartmentParams = CompartmentChainRecovery.getInstance().getStrainedCompartmentParams(this.timeToWane);
        compartmentParams.forEach(compartmentParam => {

            // console.log('a', compartmentParam.instantA * pxPerMilli, compartmentParam.immunity);

            const xMin = compartmentParam.instantA * pxPerMilli;
            const xMax = compartmentParam.instantB * pxPerMilli;
            const xDim = xMax - xMin;

            const yMin = toCanvasY(0);
            const yDim = compartmentParam.immunity * 40; // TODO magic number
            const yMax = toCanvasY(yDim);

            // weibullContext.fillStyle = 'rgba(131, 202, 13, 0.50)'; // ValueSet.COLORS.REMOVED;
            weibullContext.fillStyle = ControlsConstants.COLORS.CASES;
            weibullContext.fillRect(xMin + 0.5, yMin, (xMax - xMin) - 1, Math.min(yMax - yMin, -1));

        });

    }

    redrawCanvasReproduction(): void {

        // get the canvas
        const weibullCanvas = document.getElementById(this.weibullCanvasReproductionContainer) as HTMLCanvasElement;
        const weibullContext = weibullCanvas.getContext("2d");

        // clear the canvas
        weibullCanvas.width = document.getElementById(this.weibullCanvasReproductionContainer).offsetWidth;
        weibullCanvas.height = document.getElementById(this.weibullCanvasReproductionContainer).offsetHeight;

        weibullContext.fillStyle = "#cccccc";
        weibullContext.clearRect(0, 0, weibullCanvas.width, weibullCanvas.height);
        weibullContext.fillStyle = ControlsConstants.COLORS.EXPOSED; // 'rgba(187, 137, 12, 0.75)'; // ValueSet.COLORS.EXPOSED;

        const toCanvasY = (n: number) => weibullCanvas.height - 20 - n;
        const pxPerDay = weibullCanvas.width / (this.sliderSerialInterval.getMaxValue() * TimeUtil.MILLISECONDS_PER____DAY); // one day in pixel

        const strain: IModificationValuesStrain = {
            id: 'temp',
            key: 'STRAIN',
            instant: -1,
            name: 'misc',
            r0: this.r0,
            serialInterval: this.serialInterval,
            intervalScale: this.intervalScale,
            immuneEscape: this.immuneEscape,
            strainEscape: {},
            timeToWane: this.timeToWane,
            dstIncidence: -1,
            deletable: false,
            draggable: false,
            primary: false
        };
        const compartmentParams = CompartmentChainReproduction.getInstance().getStrainedCompartmentParams(strain);
        compartmentParams.forEach(compartmentParam => {

            const xMin = compartmentParam.instantA * pxPerDay;
            const xMax = compartmentParam.instantB * pxPerDay;
            const xDim = xMax - xMin;

            const yMin = toCanvasY(0);
            const yDim = compartmentParam.r0 * 300 / xDim; // TODO magic number
            const yMax = toCanvasY(yDim);

            // const hue = compartmentParam.presymptomatic ? 0.94 : 0.83;
            weibullContext.fillStyle = compartmentParam.presymptomatic ? ControlsConstants.COLORS.EXPOSED : ControlsConstants.COLORS.INFECTIOUS; // new Color(hue, 0.9, 0.73).getHex(); // 'rgba(218, 14, 223, 0.95)'; // ValueSet.COLORS.INFECTIOUS;
            weibullContext.fillRect(xMin + 0.5, yMin, (xMax - xMin) - 1, Math.min(yMax - yMin, -1));

        });
        const xMinN = compartmentParams[compartmentParams.length - 1].instantB * pxPerDay;

        weibullContext.fillStyle = ControlsConstants.COLORS.REMOVED;
        weibullContext.fillRect(xMinN + 1, toCanvasY(0), 500, -1);

    }

    // updateChart(): void {

    //     requestAnimationFrame(() => {
    //         this.chartTesting.acceptModification(this.modification.getModificationValues());
    //     });

    // }

}