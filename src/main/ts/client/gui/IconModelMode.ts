import { ModelConstants, MODIFICATION____KEY } from '../../model/ModelConstants';
import { ControlsConstants } from './ControlsConstants';
import { ModelMode } from './ModelMode';


export class IconModelMode {

    private readonly key: MODIFICATION____KEY;

    private readonly svgContainer: HTMLDivElement;
    private readonly containerDiv1: HTMLDivElement;
    private readonly containerDiv2: HTMLDivElement;

    constructor(key: MODIFICATION____KEY) {

        this.key = key;

        this.svgContainer = document.createElement('div');
        this.svgContainer.style.width = '30px';
        this.svgContainer.style.height = '30px';
        this.svgContainer.style.cursor = 'pointer';
        this.svgContainer.addEventListener('pointerup', e => {
            ModelMode.getInstance().toggleMode(this.key);
        });

        const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svgElement.setAttributeNS(null, 'viewBox', '-15 -15 30 30');
        svgElement.style.width = '28px';
        svgElement.style.height = '28px';
        svgElement.style.fill = 'var(--color-text)'
        this.svgContainer.appendChild(svgElement);

        const bulletPathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
        bulletPathElement.setAttributeNS(null, 'fill', '#FFFFFF');
        bulletPathElement.style.fill = ControlsConstants.COLORS[key];
        bulletPathElement.setAttributeNS(null, 'd', ControlsConstants.BULLET_CIRCLE);
        svgElement.appendChild(bulletPathElement);

        const iconPathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
        iconPathElement.setAttributeNS(null, 'fill', '#FFFFFF');
        iconPathElement.style.fill = 'black';
        iconPathElement.setAttributeNS(null, 'd', ControlsConstants.MODIFICATION_PARAMS[key].icon);
        svgElement.appendChild(iconPathElement);

        this.containerDiv1 = document.createElement('div');
        this.containerDiv1.style.display = 'table';
        this.containerDiv1.style.overflow = 'hidden';

        this.containerDiv2 = document.createElement('div');
        this.containerDiv2.style.padding = '0 0';
        this.containerDiv2.style.transition = 'padding 250ms ease-in-out';
        this.containerDiv1.appendChild(this.containerDiv2);

        const containerDiv3 = document.createElement('div');
        containerDiv3.innerHTML = '&nbsp;&nbsp;' + key;
        containerDiv3.style.userSelect = 'none';
        containerDiv3.style.paddingLeft = '12px';
        containerDiv3.style.paddingTop = '4px';
        containerDiv3.style.display = 'block';
        containerDiv3.style.transformOrigin = 'top left';
        containerDiv3.style.transform = 'rotate(-90deg) translate(-100%)';
        containerDiv3.style.marginTop = '-50%';
        containerDiv3.style.whiteSpace = 'nowrap';
        this.containerDiv2.appendChild(containerDiv3);

    }

    getSvgContainer(): HTMLDivElement {
        return this.svgContainer;
    }

    getContainerDiv1(): HTMLDivElement {
        return this.containerDiv1;
    }

    getKey(): MODIFICATION____KEY {
        return this.key;
    }

    toggle(visible: boolean): void {
        this.containerDiv2.style.padding = visible ? '50% 0' : '0 0';
    }

}