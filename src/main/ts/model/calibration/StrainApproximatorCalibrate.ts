
import { Modifications } from '../../common/modification/Modifications';
import { ModificationContact } from './../../common/modification/ModificationContact';
import { ModificationStrain } from './../../common/modification/ModificationStrain';
import { ModificationTesting } from './../../common/modification/ModificationTesting';
import { ModelInstants } from './../ModelInstants';
import { IModelProgress } from './../state/ModelStateIntegrator';
import { IBaseDataItem } from './BaseData';
import { IStrainApproximator } from './IStrainApproximator';

/**
 * strain approximator for the calibration case
 * provides an empty data-item for reference data "removed"
 *
 * TODO evaluate if this class can be combined with StrainCalibrator
 * TODO calibration requires a specific configuration
 * TODO code parts in ModelImplStrain and ModelImplVaccination
 *
 * @author h.fleischer
 * @since 22.06.2021
 */
export class StrainApproximatorCalibrate implements IStrainApproximator {

    private readonly modifications: Modifications;

    constructor(modifications: Modifications) {
        this.modifications = modifications;
    }

    getReferenceDataRemoved(): IBaseDataItem {
        // TODO build dynamically from age groups (do not hard code groups)
        return {
            "<= 04": [0, 0, 0, 0],
            "05-14": [0, 0, 0, 0],
            "15-24": [0, 0, 0, 0],
            "25-34": [0, 0, 0, 0],
            "35-44": [0, 0, 0, 0],
            "45-54": [0, 0, 0, 0],
            "55-64": [0, 0, 0, 0],
            "65-74": [0, 0, 0, 0],
            "75-84": [0, 0, 0, 0],
            ">= 85": [0, 0, 0, 0],
            "TOTAL": [0, 0, 0, 0]
        };
    }

    async approximate(progressCallback: (progress: IModelProgress) => void): Promise<void> {

        const instantDst = ModelInstants.getInstance().getMinInstant();
        const instantPre = ModelInstants.getInstance().getPreInstant();

        const modificationsStrain = this.modifications.findModificationsByType('STRAIN').map(m => m as ModificationStrain);
        const modificationContact = this.modifications.findModificationsByType('CONTACT')[0] as ModificationContact;
        const modificationValueContact = modificationContact.getModificationValues();
        const modificationTesting = this.modifications.findModificationsByType('TESTING')[0] as ModificationTesting;
        const modificationValueTesting = modificationTesting.getModificationValues();

        modificationValueContact.instant = instantPre;
        modificationValueTesting.instant = instantPre;

        console.log('modificationsStrain', modificationsStrain);

    }

}