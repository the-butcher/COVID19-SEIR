import { IIconSlider } from './IIconSlider';
import { ModelConstants, MODIFICATION____KEY } from '../../model/ModelConstants';
import { ControlsConstants } from './ControlsConstants';

/**
 * implementation of mini icon to indicate modifications
 *
 * @author h.fleischer
 * @since 29.05.2021
 */
export class IconModificationMini implements IIconSlider {

    static Z_INDEX = 100;

    private readonly svgContainer: HTMLDivElement;
    private readonly bulletGroupElement: SVGGElement;
    constructor(key: MODIFICATION____KEY) {

        this.svgContainer = document.createElement('div');
        this.svgContainer.style.filter = 'drop-shadow(2px 2px 3px var(--color-dropshadow))';

        this.svgContainer.style.width = '280px';
        this.svgContainer.style.height = '37px';
        this.svgContainer.style.left = '-14.5px';
        this.svgContainer.style.top = '0px';
        this.svgContainer.style.pointerEvents = 'none';
        this.svgContainer.style.position = 'absolute';
        this.svgContainer.style.transition = 'opacity 250ms ease-in-out';

        const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svgElement.setAttributeNS(null, 'viewBox', '-14 -15 300 40');
        svgElement.style.width = '280px';
        svgElement.style.height = '37px';
        svgElement.style.pointerEvents = 'none';
        this.svgContainer.appendChild(svgElement);

        this.bulletGroupElement = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.bulletGroupElement.style.pointerEvents = 'visible';
        this.bulletGroupElement.style.transition = 'transform 250ms ease-in-out';
        this.bulletGroupElement.style.transform = 'scale(0.25)';
        svgElement.appendChild(this.bulletGroupElement);

        const bulletPathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
        bulletPathElement.style.fill = ControlsConstants.COLORS[key];
        bulletPathElement.setAttributeNS(null, 'd', ControlsConstants.BULLET_CIRCLE);
        this.bulletGroupElement.appendChild(bulletPathElement);

    }

    setFocussed(focussed: boolean): void {
        // do nothing
    }

    getSvgContainer(): HTMLDivElement {
        return this.svgContainer;
    }

}