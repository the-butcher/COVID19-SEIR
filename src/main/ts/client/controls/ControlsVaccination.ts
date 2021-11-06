import { Demographics } from '../../common/demographics/Demographics';
import { IVaccinationConfig2 } from '../../common/demographics/IVaccinationConfig2';
import { ModificationVaccination } from '../../common/modification/ModificationVaccination';
import { ObjectUtil } from '../../util/ObjectUtil';
import { ControlsConstants } from '../gui/ControlsConstants';
import { SliderModification } from '../gui/SliderModification';
import { SliderVaccination } from '../gui/SliderVaccination';
import { StorageUtil } from '../storage/StorageUtil';
import { Controls } from './Controls';

/**
 * controller for editing vaccination modifications
 *
 * @author h.fleischer
 * @since 25.05.2021
 */
export class ControlsVaccination {

    static getInstance(): ControlsVaccination {
        if (ObjectUtil.isEmpty(this.instance)) {
            this.instance = new ControlsVaccination();
        }
        return this.instance;
    }
    private static instance: ControlsVaccination;

    private modification: ModificationVaccination;

    private readonly slidersVaccination: SliderVaccination[];

    constructor() {
        this.slidersVaccination = [];
        Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
            this.slidersVaccination.push(new SliderVaccination(ageGroup.getName()));
        });
    }

    handleChange(): void {

        // TODO it must be ensured that a modification can not have lower values than a previous modification

        const vaccinations: { [K in string] : IVaccinationConfig2 } = {};

        this.slidersVaccination.forEach(sliderVaccination => {
            vaccinations[sliderVaccination.getName()] = {
                v1: sliderVaccination.getValue(0),
                v2: sliderVaccination.getValue(1)
            };
        });

        this.modification.acceptUpdate({
            vaccinations
        });

        SliderModification.getInstance().indicateUpdate(this.modification.getId());
        StorageUtil.getInstance().setSaveRequired(true);
        ControlsConstants.MODIFICATION_PARAMS[this.modification.getKey()].handleModificationUpdate(); // update model after modification update

    }

    acceptModification(modification: ModificationVaccination): void {

        Controls.acceptModification(modification);
        this.modification = modification;

        this.slidersVaccination.forEach(sliderVaccination => {
            const vaccinations = this.modification.getVaccinationConfig2(sliderVaccination.getName());
            sliderVaccination.setValue(0, vaccinations.v1);
            sliderVaccination.setValue(1, vaccinations.v2);
        });

        requestAnimationFrame(() => {
            this.slidersVaccination.forEach(sliderVaccination => {
                sliderVaccination.handleResize();
            });
        });

    }

}