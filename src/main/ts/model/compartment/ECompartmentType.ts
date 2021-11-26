/**
 * distinct list of compartment types
 *
 * @author h.fleischer
 * @since 16.05.2021
 */
export enum ECompartmentType {

    S__SUSCEPTIBLE,
    E______EXPOSED,
    I_INFECTIOUS_A,
    I_INFECTIOUS_R,
    R___REMOVED_ID, // removed after known infection
    R___REMOVED_IU, // removed after asymptomatic infection
    R___REMOVED_VI, // vaccinated, immunizing
    R___REMOVED_VU, // vaccinated, after unknown infection
    R___REMOVED_V2, // vaccinated, without previous infection
    R_________DEAD,
    X__INCIDENCE_0,
    X__INCIDENCE_N,

}