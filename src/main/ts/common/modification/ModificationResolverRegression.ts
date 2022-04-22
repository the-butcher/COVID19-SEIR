import { AModificationResolver } from './AModificationResolver';
import { IModificationValuesRegression } from './IModificationValuesRegression';
import { ModificationRegression } from './ModificationRegression';

/**
 * modification resolver for regression modifications
 * no-op
 *
 * @author h.fleischer
 * @since 01.11.2021
 */
export class ModificationResolverRegression extends AModificationResolver<IModificationValuesRegression, ModificationRegression> {

    constructor() {
        super('REGRESSION');
    }

}