import { ObjectUtil } from '../../util/ObjectUtil';
import { MODIFICATION____KEY } from '../../model/ModelConstants';
import { IconModelMode } from './IconModelMode';
import { SliderModification } from './SliderModification';

/**
 * this class controls model-mode, which defines the type of modification currently edited in the model
 *
 * @author h.fleischer
 * @since 11.04.2021
 */
export class ModelMode {

    static getInstance(): ModelMode {
        if (ObjectUtil.isEmpty(this.instance)) {
            this.instance = new ModelMode();
        }
        return this.instance;
    }

    private static instance: ModelMode;

    private key: MODIFICATION____KEY;
    private readonly modelModeIcons: IconModelMode[];

    constructor() {

        this.modelModeIcons = [];
        this.modelModeIcons.push(new IconModelMode('TIME'));
        this.modelModeIcons.push(new IconModelMode('STRAIN'));
        this.modelModeIcons.push(new IconModelMode('CONTACT'));
        this.modelModeIcons.push(new IconModelMode('TESTING'));
        this.modelModeIcons.push(new IconModelMode('VACCINATION'));
        this.modelModeIcons.push(new IconModelMode('SEASONALITY'));
        this.modelModeIcons.push(new IconModelMode('SETTINGS'));

        const containerDivLeft = document.getElementById('modelModeDiv');
        this.modelModeIcons.forEach(modelModeIcon => {
            containerDivLeft.appendChild(modelModeIcon.getSvgContainer());
            containerDivLeft.appendChild(modelModeIcon.getContainerDiv1());
        });

    }

    getKey(): MODIFICATION____KEY {
        return this.key;
    }

    toggleMode(key: MODIFICATION____KEY): void {
        this.key = key;
        this.modelModeIcons.forEach(modelModeIcon => {
            modelModeIcon.toggle(modelModeIcon.getKey() === key);
        });
        SliderModification.getInstance().showModifications(key);
    }

}