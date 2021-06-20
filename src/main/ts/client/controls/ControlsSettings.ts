import { ModificationSettings } from '../../common/modification/ModificationSettings';
import { ModelConstants } from '../../model/ModelConstants';
import { ObjectUtil } from '../../util/ObjectUtil';
import { SliderModification } from '../gui/SliderModification';
import { SliderSetting } from '../gui/SliderSetting';
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
    // private sliderDead: SliderSetting;

    private modification: ModificationSettings;

    constructor() {

        this.sliderUndetected = new SliderSetting("undetected (multiplier)", ModelConstants.RANGE________UNDETECTED, 0.1, false);
        this.sliderQuarantine = new SliderSetting("quarantine (reduction)", ModelConstants.RANGE____PERCENTAGE_100, 0.01, true);
        // this.sliderDead = new SliderSetting("deceased", ModelConstants.RANGE__PERCENTAGE__10, 0.001);

    }

    handleChange(): void {

        const undetected = this.sliderUndetected.getValue();
        const quarantine = this.sliderQuarantine.getValue();
        const dead = 0; // const dead = this.sliderDead.getValue();
        this.modification.acceptUpdate({
            undetected,
            quarantine,
            dead
        });

        SliderModification.getInstance().indicateUpdate(this.modification.getId());

    }

    acceptModification(modification: ModificationSettings): void {

        Controls.acceptModification(modification);
        this.modification = modification;

        this.sliderUndetected.setValue(this.modification.getUndetected());
        this.sliderQuarantine.setValue(this.modification.getQuarantine());
        // this.sliderDead.setValue(this.modification.getDead());
        requestAnimationFrame(() => {
            this.sliderUndetected.handleResize();
            this.sliderQuarantine.handleResize();
        });

        this.modification = modification;

    }

}