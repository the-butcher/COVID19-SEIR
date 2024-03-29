
import { Modifications } from '../../common/modification/Modifications';
import { ModificationContact } from './../../common/modification/ModificationContact';
import { ModificationStrain } from './../../common/modification/ModificationStrain';
import { ModificationDiscovery } from '../../common/modification/ModificationDiscovery';
import { ModelInstants } from './../ModelInstants';
import { IModelProgress } from './../state/ModelStateIntegrator';
import { IBaseDataItemConfig } from '../basedata/BaseData';
import { IStrainApproximator } from './IStrainApproximator';
import { BaseDataItem, IBaseDataItem } from '../basedata/BaseDataItem';

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
        return new BaseDataItem(ModelInstants.getInstance().getMinInstant(), {
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
        });
    }

    async approximate(progressCallback: (progress: IModelProgress) => void): Promise<void> {

        const instantDst = ModelInstants.getInstance().getMinInstant();
        const instantPre = ModelInstants.getInstance().getPreInstant();

        const modificationsStrain = this.modifications.findModificationsByType('STRAIN').map(m => m as ModificationStrain);
        const modificationContact = this.modifications.findModificationsByType('CONTACT')[0] as ModificationContact;
        const modificationValueContact = modificationContact.getModificationValues();
        const modificationDiscovery = this.modifications.findModificationsByType('TESTING')[0] as ModificationDiscovery;
        const modificationValueDiscovery = modificationDiscovery.getModificationValues();

        modificationValueContact.instant = instantPre;
        modificationValueDiscovery.instant = instantPre;

        console.log('modificationsStrain', modificationsStrain);

    }

}