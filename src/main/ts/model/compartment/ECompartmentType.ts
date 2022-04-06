/**
 * distinct list of compartment types
 *
 * @author h.fleischer
 * @since 16.05.2021
 */
export enum ECompartmentType {

    S__SUSCEPTIBLE,
    E______EXPOSED,
    I___INFECTIOUS,
    R____RECOVERED, // removed after known infection
    R___IMMUNIZING, // vaccinated, immunizing
    R___VACCINATED, // vaccinated, without previous infection
    X__INCIDENCE_0,
    X__INCIDENCE_N,

}