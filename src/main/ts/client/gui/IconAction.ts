import { ControlsConstants } from './ControlsConstants';
import { IIconActionParams } from './ModelActions';

/**
 * simple helper type for the actions icons in the lower left screen corner
 *
 * @author h.fleischer
 * @since 25.05.2021
 */
export class IconAction {

    constructor(params: IIconActionParams) {

        const container = document.getElementById(params.container) as HTMLDivElement;
        const svgContainer = container.getElementsByTagName('svg').item(0) as SVGSVGElement;

        // container.addEventListener('pointerover', () => {
        //     svgContainer.style.fill = ControlsConstants.COLOR____FONT;
        // });
        // container.addEventListener('pointerout', () => {
        //     svgContainer.style.fill = '#555555';
        // });
        container.addEventListener('click', () => {
            params.actionFunction();
        });

    }

}