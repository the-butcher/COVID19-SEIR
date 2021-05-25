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

    private sliderRecoveredD: SliderSetting;
    private sliderRecoveredU: SliderSetting;
    private sliderVaccinated: SliderSetting;
    private sliderDead: SliderSetting;

    private modification: ModificationSettings;

    constructor() {

        const absTotal = Demographics.getInstance().getAbsTotal();
        const exp = Math.round(Math.log10(absTotal));

        this.sliderRecoveredD = new SliderSetting("recovered (tested)", ModelConstants.RANGE__PERCENTAGE_100, 0.01);
        this.sliderRecoveredU = new SliderSetting("recovered (asymptomatic)", ModelConstants.RANGE__PERCENTAGE_100, 0.01);
        this.sliderVaccinated = new SliderSetting("vaccinated (1st dose)", ModelConstants.RANGE__PERCENTAGE_100, 0.01);
        this.sliderDead = new SliderSetting("deceased", ModelConstants.RANGE__PERCENTAGE__10, 0.001);

    }

    handleChange(): void {

        const recoveredD = this.sliderRecoveredD.getValue();
        const recoveredU = this.sliderRecoveredU.getValue();
        const vaccinated = this.sliderVaccinated.getValue();
        const dead = this.sliderDead.getValue();
        this.modification.acceptUpdate({
            recoveredD,
            recoveredU,
            vaccinated,
            dead
        });

        SliderModification.getInstance().indicateUpdate(this.modification.getId());

    }

    acceptModification(modification: ModificationSettings): void {
        Controls.acceptModification(modification);
        this.modification = modification;
        this.sliderRecoveredD.setValue(this.modification.getRecoveredD());
        this.sliderRecoveredU.setValue(this.modification.getRecoveredU());
        this.sliderVaccinated.setValue(this.modification.getVaccinated());
        this.sliderDead.setValue(this.modification.getDead());
        this.modification = modification;
    }

}