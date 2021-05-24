import { ControlsConstants } from '../gui/ControlsConstants';

/**
 * helper icon used in the contact-matrix axis toggle functionality
 *
 * @author h.fleischer
 * @since 16.05.2021
 */
export class IconMatrixAxis {

    private readonly id: string;
    private readonly svgContainer: HTMLDivElement;
    private readonly bulletPathFg: SVGPathElement;
    private readonly bulletPathBg: SVGPathElement;

    constructor() {

        this.svgContainer = document.createElement('div');
        this.svgContainer.style.width = '30px';
        this.svgContainer.style.height = '30px';
        this.svgContainer.style.cursor = 'pointer';
        this.svgContainer.style.position = 'absolute';
        this.svgContainer.style.left = '23px';
        this.svgContainer.style.top = '280px';

        const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svgElement.setAttributeNS(null, 'viewBox', '-15 -15 30 30');
        svgElement.style.width = '28px';
        svgElement.style.height = '28px';
        svgElement.style.fill = 'var(--color-text)'
        this.svgContainer.appendChild(svgElement);

        this.bulletPathBg = document.createElementNS("http://www.w3.org/2000/svg", "path");
        this.bulletPathBg.setAttributeNS(null, 'fill', '#FFFFFF');
        this.bulletPathBg.style.fill = ControlsConstants.COLOR____FONT;
        this.bulletPathBg.setAttributeNS(null, 'd', ControlsConstants.BULLET_CIRCLE);
        svgElement.appendChild(this.bulletPathBg);

        this.bulletPathFg = document.createElementNS("http://www.w3.org/2000/svg", "path");
        this.bulletPathFg.setAttributeNS(null, 'fill', '#FFFFFF');
        this.bulletPathFg.style.fill = '#2e2e2e';
        this.bulletPathFg.setAttributeNS(null, 'd', ControlsConstants.ICON_____ZOOM);
        this.bulletPathFg.style.transition = 'transform 250ms ease-in-out, opacity 250ms ease-in-out';
        svgElement.appendChild(this.bulletPathFg);

    }

    getSvgContainer(): HTMLDivElement {
        return this.svgContainer;
    }

    setAngle(degrees: number): void {
        this.bulletPathFg.style.transform = `rotate(${degrees}deg)`;
    }

}