import { ModificationSettings } from '../../common/modification/ModificationSettings';
import { CompartmentChainRecovery } from '../../model/compartment/CompartmentChainRecovery';
import { ModelConstants } from '../../model/ModelConstants';
import { ObjectUtil } from '../../util/ObjectUtil';
import { ControlsConstants } from '../gui/ControlsConstants';
import { IconSlider } from '../gui/IconSlider';
import { Slider } from '../gui/Slider';
import { SliderModification } from '../gui/SliderModification';
import { SliderSetting } from '../gui/SliderSetting';
import { StorageUtil } from '../storage/StorageUtil';
import { TimeUtil } from './../../util/TimeUtil';
import { Controls } from './Controls';

/**
 * controller for editing settings modifications
 *
 * @author h.fleischer
 * @since 25.05.2021
 */
export class ControlsSettings {

    static getInstance(): ControlsSettings {
        if (ObjectUtil.isEmpty(this.instance)) {
            this.instance = new ControlsSettings();
        }
        return this.instance;
    }
    private static instance: ControlsSettings;

    private sliderUndetected: SliderSetting;
    private sliderQuarantine: SliderSetting;
    private sliderReexposure: Slider;
    // private sliderDead: SliderSetting;

    private timeToWane: number;

    private modification: ModificationSettings;

    private readonly weibullCanvasVaccinationContainer = 'weibullCanvasVaccination';

    constructor() {

        this.sliderUndetected = new SliderSetting("undetected (multiplier)", ModelConstants.RANGE________UNDETECTED, 0.1, false);
        this.sliderQuarantine = new SliderSetting("quarantine (reduction)", ModelConstants.RANGE____PERCENTAGE_100, 0.01, true);
        // this.sliderReexposure = new SliderSetting("reexposure (months)", ModelConstants.RANGE________REEXPOSURE, 0.1, false);
        // this.sliderDead = new SliderSetting("deceased", ModelConstants.RANGE__PERCENTAGE__10, 0.001);

        this.sliderReexposure = new Slider({
            container: 'sliderVaccination',
            min: Math.min(...ModelConstants.RANGE________REEXPOSURE),
            max: Math.max(...ModelConstants.RANGE________REEXPOSURE),
            step: 0.1,
            values: [3.0],
            ticks: [1, 2, 3, 4],
            label: 'immunity (months)',
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
                this.timeToWane = value;
                this.redrawCanvasVaccination();
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
        this.sliderReexposure.setLabelPosition(13);

    }

    redrawCanvasVaccination(): void {

        // get the canvas
        const weibullCanvas = document.getElementById(this.weibullCanvasVaccinationContainer) as HTMLCanvasElement;
        const weibullContext = weibullCanvas.getContext("2d");

        // clear the canvas
        weibullCanvas.width = document.getElementById(this.weibullCanvasVaccinationContainer).offsetWidth;
        weibullCanvas.height = document.getElementById(this.weibullCanvasVaccinationContainer).offsetHeight;

        weibullContext.fillStyle = "#cccccc";
        weibullContext.clearRect(0, 0, weibullCanvas.width, weibullCanvas.height);

        const toCanvasY = (n: number) => weibullCanvas.height - 20 - n;
        const pxPerMilli = weibullCanvas.width / (this.sliderReexposure.getMaxValue() * TimeUtil.MILLISECONDS_PER____DAY * 30); // one month in pixel

        console.log('pxPerMonth', pxPerMilli);

        const compartmentParams = CompartmentChainRecovery.getInstance().getStrainedCompartmentParams(this.timeToWane);
        compartmentParams.forEach(compartmentParam => {

            // console.log('a', compartmentParam.instantA * pxPerMilli, compartmentParam.immunity);

            const xMin = compartmentParam.instantA * pxPerMilli;
            const xMax = compartmentParam.instantB * pxPerMilli;
            const xDim = xMax - xMin;

            const yMin = toCanvasY(0);
            const yDim = compartmentParam.immunity * 40; // TODO magic number
            const yMax = toCanvasY(yDim);

            weibullContext.fillStyle = 'rgba(131, 202, 13, 0.50)'; // ValueSet.COLORS.REMOVED;
            weibullContext.fillRect(xMin + 0.5, yMin, (xMax - xMin) - 1, Math.min(yMax - yMin, -1));

        });

    }

    handleChange(): void {

        const undetected = this.sliderUndetected.getValue();
        const quarantine = this.sliderQuarantine.getValue();
        // const reexposure = this.sliderReexposure.getValue();
        console.log('changing reexposure to', this.timeToWane);

        const dead = 0; // const dead = this.sliderDead.getValue();
        this.modification.acceptUpdate({
            undetected,
            quarantine,
            reexposure: this.timeToWane,
            dead
        });

        SliderModification.getInstance().indicateUpdate(this.modification.getId());
        StorageUtil.getInstance().setSaveRequired(true);
        ControlsConstants.MODIFICATION_PARAMS[this.modification.getKey()].handleModificationUpdate(); // update model after modification update

    }

    acceptModification(modification: ModificationSettings): void {

        Controls.acceptModification(modification);
        this.modification = modification;

        this.sliderUndetected.setValue(this.modification.getInitialUndetected());
        this.sliderQuarantine.setValue(this.modification.getQuarantine(-1)); // TODO - deprecate the slider, then introduce a contact category specific setting and calculate a value from there

        this.timeToWane = this.modification.getReexposure();
        if (ObjectUtil.isEmpty(this.timeToWane)) {
            this.timeToWane = 12;
        }
        this.sliderReexposure.setValueAndRedraw(0, this.timeToWane, false);
        // this.sliderDead.setValue(this.modification.getDead());
        console.log('accepting reexposure', this.timeToWane);

        requestAnimationFrame(() => {
            this.sliderUndetected.handleResize();
            this.sliderQuarantine.handleResize();
            this.sliderReexposure.handleResize();
        });

        this.modification = modification;

        this.redrawCanvasVaccination();


    }

}