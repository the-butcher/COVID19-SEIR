import { Demographics } from '../../common/demographics/Demographics';
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

    // private sliderRecoveredD: SliderSetting;
    private sliderUndetected: SliderSetting;
    private sliderVaccinated: SliderSetting;
    private sliderQuarantine: SliderSetting;
    // private sliderDead: SliderSetting;

    private modification: ModificationSettings;

    constructor() {

        // const absTotal = Demographics.getInstance().getAbsTotal();
        // const exp = Math.round(Math.log10(absTotal));

        this.sliderUndetected = new SliderSetting("undetected (multiplier)", ModelConstants.RANGE________UNDETECTED, 0.1, false);
        this.sliderVaccinated = new SliderSetting("vaccinated (1st dose)", ModelConstants.RANGE____PERCENTAGE_100, 0.01, true);
        this.sliderQuarantine = new SliderSetting("quarantine (reduction)", ModelConstants.RANGE____PERCENTAGE_100, 0.01, true);
        // this.sliderDead = new SliderSetting("deceased", ModelConstants.RANGE__PERCENTAGE__10, 0.001);

    }

    handleChange(): void {

        // const recoveredD = this.sliderRecoveredD.getValue();
        const undetected = this.sliderUndetected.getValue();
        const vaccinated = this.sliderVaccinated.getValue();
        const quarantine = this.sliderQuarantine.getValue();
        const dead = 0; // const dead = this.sliderDead.getValue();
        this.modification.acceptUpdate({
            undetected,
            vaccinated,
            quarantine,
            dead
        });

        SliderModification.getInstance().indicateUpdate(this.modification.getId());

    }

    acceptModification(modification: ModificationSettings): void {
        Controls.acceptModification(modification);
        this.modification = modification;
        this.sliderUndetected.setValue(this.modification.getUndetected());
        this.sliderVaccinated.setValue(this.modification.getVaccinated());
        this.sliderQuarantine.setValue(this.modification.getQuarantine());
        // this.sliderDead.setValue(this.modification.getDead());
        this.modification = modification;
    }

}