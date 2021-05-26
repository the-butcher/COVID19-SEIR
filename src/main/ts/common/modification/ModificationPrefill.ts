import { ModificationTime } from './ModificationTime';

/**
 * subclass for modification time specific for model init when vaccinations are pre-filled
 *
 * @author h.fleischer
 * @since 26.05.2021
 */
export class ModificationPrefill extends ModificationTime {

    constructor() {
        super({
            id: 'prefill',
            key: 'TIME',
            instant: -1,
            name: 'step',
            deletable: false,
            draggable: false
        });
    }

    getDosesPerDay(): number {
        return 100000;
    }

}