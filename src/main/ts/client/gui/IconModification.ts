import { IIconSlider } from './IIconSlider';
import { ModelConstants, MODIFICATION____KEY } from '../../model/ModelConstants';
import { ControlsConstants } from './ControlsConstants';

/**
 * implementation of IIconSlider specific for a slider controlling instances of IModification
 *
 * @author h.fleischer
 * @since 13.05.2021
 */
export class IconModification implements IIconSlider {

    static Z_INDEX = 100;
    static readonly TRANSFORM_OUT = 'scale(0.75)';
    static readonly TRANSFORM__IN = 'scale(0.55)';

    private readonly id: string;
    private readonly key: MODIFICATION____KEY;
    private readonly svgContainer: HTMLDivElement;
    private readonly bulletGroupElement: SVGGElement;
    private readonly bulletFocusElement: SVGGElement;
    private readonly handleGroupElement: SVGGElement;
    private lastHandleOpacity: number;

    constructor(id: string, key: MODIFICATION____KEY, handleText?: string) {

        this.id = id;
        this.key = key;
        this.lastHandleOpacity = 0.6;

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

        this.handleGroupElement = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.handleGroupElement.style.pointerEvents = 'visible';
        this.handleGroupElement.style.opacity = `${this.lastHandleOpacity}`;
        this.handleGroupElement.style.display = 'none';
        this.handleGroupElement.style.transition = 'opacity 250ms ease-in-out';
        this.handleGroupElement.style.transform = IconModification.TRANSFORM__IN;
        svgElement.appendChild(this.handleGroupElement);

        if (handleText) {

            /**
             * a handle shape extending to the right from the bullet
             */
            const handlePathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
            handlePathElement.style.stroke = ControlsConstants.COLORS[key];
            handlePathElement.style.strokeWidth = '24.8';
            handlePathElement.style.strokeLinecap = 'round';
            handlePathElement.setAttributeNS(null, 'd', 'M0 0L70 0');
            this.handleGroupElement.appendChild(handlePathElement);

            /**
             * text within the handle
             */
            const handleTextElement = document.createElementNS("http://www.w3.org/2000/svg", "text");
            handleTextElement.setAttributeNS(null, 'x', '16');
            handleTextElement.setAttributeNS(null, 'y', '6');
            handleTextElement.style.fill = 'black';
            handleTextElement.innerHTML = handleText;
            this.handleGroupElement.appendChild(handleTextElement);

        }


        /**
         * container for the bullet itself
         */
        this.bulletGroupElement = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.bulletGroupElement.style.pointerEvents = 'visible';
        this.bulletGroupElement.style.opacity = '0.8';
        this.bulletGroupElement.style.transition = 'transform 250ms ease-in-out';
        this.bulletGroupElement.style.transform = IconModification.TRANSFORM__IN;
        svgElement.appendChild(this.bulletGroupElement);

        /**
         * bullet background
         */
        const bulletPathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
        bulletPathElement.style.fill = ControlsConstants.COLORS[key];
        bulletPathElement.setAttributeNS(null, 'd', ControlsConstants.BULLET_CIRCLE);
        this.bulletGroupElement.appendChild(bulletPathElement);

        this.bulletFocusElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
        this.bulletFocusElement.style.stroke = ControlsConstants.COLOR____FONT;
        this.bulletFocusElement.style.strokeWidth = '2px';
        this.bulletFocusElement.style.opacity = '0';
        this.bulletFocusElement.style.fillOpacity = '0';
        this.bulletFocusElement.setAttributeNS(null, 'd', ControlsConstants.BULLET_CIRCLE);
        this.bulletGroupElement.appendChild(this.bulletFocusElement);

        const iconPathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
        iconPathElement.style.fill = 'black';
        iconPathElement.setAttributeNS(null, 'd', ControlsConstants.MODIFICATION_PARAMS[key].icon);
        this.bulletGroupElement.appendChild(iconPathElement);

    }

    setFocussed(focussed: boolean): void {
        this.bulletFocusElement.style.opacity = focussed ? '1' : '0';
    }

    getId(): string {
        return this.id;
    }

    getLastHandleOpacity(): number {
        return this.lastHandleOpacity;
    }

    setHandleOpacity(opacity: number): void {
        this.handleGroupElement.style.opacity = `${opacity}`;
        if (opacity > 0) {
            this.lastHandleOpacity = opacity;
            this.handleGroupElement.style.display = 'block';
        } else {
            setTimeout(() => {
                this.handleGroupElement.style.display = 'none';
            }, 500);
        }
    }

    getBulletGroupElement(): SVGGElement {
        return this.bulletGroupElement;
    }

    getHandleGroupElement(): SVGGElement {
        return this.handleGroupElement;
    }

    getSvgContainer(): HTMLDivElement {
        return this.svgContainer;
    }

    getKey(): MODIFICATION____KEY {
        return this.key;
    }

}