/**
 * definition for types that can provide a svg icon, embedded into a svg element
 *
 * @author h.fleischer
 * @since 13.05.2021
 */
export interface IIconSlider {

    /**
     * get the svg container element
     */
    getSvgContainer(): HTMLDivElement;

    setFocussed(focussed: boolean): void;

}