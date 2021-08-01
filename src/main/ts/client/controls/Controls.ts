import { IModification } from '../../common/modification/IModification';
import { IModificationValues } from '../../common/modification/IModificationValues';
import { ModelConstants, MODIFICATION____KEY } from '../../model/ModelConstants';
import { ObjectUtil } from '../../util/ObjectUtil';
import { ControlsConstants } from '../gui/ControlsConstants';
import { SliderModification } from '../gui/SliderModification';
import { StorageUtil } from '../storage/StorageUtil';

export class Controls {

    /**
     * show the given modification in icon, title, date
     * @param modification
     */
    static acceptModification(modification: IModification<IModificationValues>): void {

        // title
        Controls.getTextElement().innerHTML = modification.getName();

        // icon
        document.getElementById('modificationBgPath').style.fill = ControlsConstants.COLORS[modification.getKey()];
        document.getElementById('modificationFgPath').setAttributeNS(null, 'd', ControlsConstants.MODIFICATION_PARAMS[modification.getKey()].icon);

        // show the content matching the type of this modification
        Object.keys(ModelConstants.MODIFICATION_PARAMS).forEach(key => {
            const display = key === modification.getKey() ? 'flex' : 'none';
            // const visibility = key === modification.getKey() ? 'visible' : 'hidden';
            const element = document.getElementById(ControlsConstants.MODIFICATION_PARAMS[key as MODIFICATION____KEY].container);
            element.style.display = display;
            // element.style.visibility = visibility;
        });

        // date
        if (modification.getNature() === 'INSTANT') {
            document.getElementById('modificationInstantDiv').innerHTML = new Date(modification.getInstantA()).toLocaleDateString();
        } else {
            document.getElementById('modificationInstantDiv').innerHTML = new Date(modification.getInstantA()).toLocaleDateString() + ' - ' + new Date(modification.getInstantB()).toLocaleDateString();
        }

        Controls.modification = modification;

    }

    static getInputElement(): HTMLInputElement {
        if (ObjectUtil.isEmpty(Controls.inputElement)) {
            Controls.inputElement = document.getElementById('modificationTitleInput') as HTMLInputElement;
            Controls.inputElement.addEventListener('blur', e => {
                Controls.handleChange();
            });
            Controls.inputElement.addEventListener('change', e => {
                Controls.handleChange();
            });
        }
        return Controls.inputElement;
    }

    static getTextElement(): HTMLSpanElement {

        if (ObjectUtil.isEmpty(Controls.textElement)) {
            Controls.textElement = document.getElementById('modificationTitleSpan') as HTMLSpanElement;

            // switch to input element when clicking the text
            Controls.textElement.addEventListener('focus', e => {
                document.getElementById('modificationTitleDiv').style.paddingTop = '2px';
                Controls.getInputElement().value = Controls.textElement.innerHTML;
                Controls.getInputElement().style.display = 'block';
                Controls.getInputElement().focus();
                Controls.textElement.style.display = 'none';
            });
        }
        return Controls.textElement;

    }

    static handleChange(): void {

        document.getElementById('modificationTitleDiv').style.paddingTop = '5px';

        Controls.modification.acceptUpdate({
            name: this.inputElement.value
        });
        Controls.textElement.innerHTML = this.inputElement.value;
        Controls.inputElement.style.display = 'none';
        Controls.textElement.style.display = 'block';

        SliderModification.getInstance().indicateUpdate(Controls.modification.getId());

    }

    private static inputElement: HTMLInputElement;
    private static textElement: HTMLSpanElement;
    private static modification: IModification<IModificationValues>;

}