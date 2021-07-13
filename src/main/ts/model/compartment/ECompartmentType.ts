/**
 * distinct list of compartment types
 *
 * @author h.fleischer
 * @since 16.05.2021
 */
export enum ECompartmentType {

    S_SUSCEPTIBLE,
    E_____EXPOSED,
    I__INFECTIOUS,
    R__REMOVED_ID, // removed after known infection
    R__REMOVED_IU, // removed after asymptomatic infection
    R__REMOVED_VI, // vaccinated, immunizing
    R__REMOVED_VU, // vaccinated, after unknown infection
    R__REMOVED_V2, // vaccinated, without previous infection
    X__REMOVED_VC, // vaccinated (control compartment)
    R________DEAD,
    X__INCUBATE_0,
    X__INCUBATE_N,

}