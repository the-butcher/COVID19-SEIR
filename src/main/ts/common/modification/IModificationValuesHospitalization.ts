import { IModificationValues } from "./IModificationValues";

export interface ICourseOfInfectionValues {

    /**
     * the default case (1-other_rates), "recovery at home" would be attached directly to the last infectious compartment
     */
    timeHomeToRecovery: number;

    /**
     * time and rate at which individuals require hospitalization
     * how would the model take care of hospital capacity?
     * POC1 :: move all that can not be hospitalized to a specific compartment where people
     */
    rateHomeToHospital: number;
    timeHomeToHospital: number; 
    
    /**
     * time and rate of individuals dying without prior admission to hospital
     */
    rateHomeToDead: number;
    timeHomeToDead: number;

    /**
    * rates for hospital to other states (recovered, icu, dead)
    */
    timeHospitalToRecovery: number;

    /**
     * time and rate at which individuals require intensive care after admission to hospital
     */
    timeHospitalToIcu: number;
    rateHospitalToIcu: number;

    /**
     * time and rate of inidividuals dying in non-icu hospitalization
     */
    timeHospitalToDead: number;
    rateHospitalToDead: number;
 
     /**
      * rates for icu to other states (recovered, dead)
      */
    timeIcuToRecovery: number;
    
    /**
     * time and rate of inidividuals dying icu hospitalization
     */
    timeIcuToDead: number;
    rateIcuToDead: number;

}

export interface IModificationValuesHospitalization  extends IModificationValues {

    coursesOfInfection: { [K in string]: ICourseOfInfectionValues };

}