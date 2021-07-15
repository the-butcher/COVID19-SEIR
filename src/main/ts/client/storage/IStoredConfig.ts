import { IAnyModificationValue } from './../../common/modification/Modifications';
export interface IStoredConfig {
    model_______version?: string;
    model______basedata: string,
    model__demographics: string,
    model_____daterange: string[];
    model_modifications: IAnyModificationValue[];
}