import { TimeUtil } from './../../util/TimeUtil';
import { ModificationSettings } from '../../common/modification/ModificationSettings';
import { ModelConstants } from '../../model/ModelConstants';
import { ObjectUtil } from '../../util/ObjectUtil';
import { SliderModification } from '../gui/SliderModification';
import { SliderSetting } from '../gui/SliderSetting';
import { Controls } from './Controls';
import { ControlsConstants } from '../gui/ControlsConstants';
import { StorageUtil } from '../storage/StorageUtil';

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
    private sliderReexposure: SliderSetting;
    // private sliderDead: SliderSetting;

    private modification: ModificationSettings;

    constructor() {

        this.sliderUndetected = new SliderSetting("undetected (multiplier)", ModelConstants.RANGE________UNDETECTED, 0.1, false);
        this.sliderQuarantine = new SliderSetting("quarantine (reduction)", ModelConstants.RANGE____PERCENTAGE_100, 0.01, true);
        this.sliderReexposure = new SliderSetting("reexposure (months)", ModelConstants.RANGE________REEXPOSURE, 1, false);
        // this.sliderDead = new SliderSetting("deceased", ModelConstants.RANGE__PERCENTAGE__10, 0.001);

    }

    handleChange(): void {

        const undetected = this.sliderUndetected.getValue();
        const quarantine = this.sliderQuarantine.getValue();
        const reexposure = this.sliderReexposure.getValue();
        console.log('changing reexposure to', reexposure);

        const dead = 0; // const dead = this.sliderDead.getValue();
        this.modification.acceptUpdate({
            undetected,
            quarantine,
            reexposure,
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

        let reexposure = this.modification.getReexposure();
        if (ObjectUtil.isEmpty(reexposure)) {
            reexposure = 12;
        }
        this.sliderReexposure.setValue(reexposure);
        // this.sliderDead.setValue(this.modification.getDead());

        requestAnimationFrame(() => {
            this.sliderUndetected.handleResize();
            this.sliderQuarantine.handleResize();
            this.sliderReexposure.handleResize();
        });

        this.modification = modification;

    }

}