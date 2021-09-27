import { IBaseDataMarker } from '../model/basedata/BaseData';
import { CoordinateUtil } from './CoordinateUtil';
import { ICoordinate } from './ICoordinate';
export class DouglasPeucker {

    private readonly dataMarkers: IBaseDataMarker[];

    constructor(dataMarkers: IBaseDataMarker[]) {
        this.dataMarkers = dataMarkers;
    }

    findIndices(): number[] {

        let indices: number[] = [
            0,
            this.dataMarkers.length-1
        ];

        /**
         * values for reproduction-rate
         */
        // const tolerance = 2;
        // const yStretch = 50;
        const tolerance = 2;
        const yStretch = 50;

        // TODO while tolerance not reached (or not reachable)
        for (let iteration = 0; iteration < 30; iteration++) {

            let maxIndices: number[] = [];
            for (let indexP = 1; indexP < indices.length; indexP++) {

                const indexA = indices[indexP - 1];
                const indexB = indices[indexP];

                let coordA: ICoordinate = {
                    x: indexA,
                    y: this.dataMarkers[indexA].derived * yStretch
                };
                let coordB: ICoordinate = {
                    x: indexB,
                    y: this.dataMarkers[indexB].derived * yStretch
                };

                // console.log('testing range', coordA, coordB);

                let maxTolerance = tolerance;
                let maxIndexT = -1
                for (let indexT = indexA + 1; indexT < indexB; indexT++) {

                    // coordinate being tested
                    let coordT: ICoordinate = {
                        x: indexT,
                        y: this.dataMarkers[indexT].derived * yStretch
                    };

                    // project AT onto unit vector of AB, will yield the projected length on AB
                    let diffAB = CoordinateUtil.getDiff(coordA, coordB);
                    let diffAT = CoordinateUtil.getDiff(coordA, coordT)
                    let length = CoordinateUtil.getLength(diffAB);
                    diffAB = CoordinateUtil.toUnit(diffAB);
                    let proj = CoordinateUtil.getDotProduct(diffAB, diffAT);

                    if (proj >= 0 && proj <= length) {

                        const coordP = CoordinateUtil.add(coordA, CoordinateUtil.multiply(diffAB, proj));
                        const diffPT = CoordinateUtil.getDiff(coordP, coordT);
                        const normal = CoordinateUtil.getLength(diffPT);

                        // const prop = Math.max(normal / length, normal / (length - proj));

                        if (normal > maxTolerance) { //  || normal / length > maxTriangle
                            maxTolerance = normal;
                            maxIndexT = indexT;
                        }

                    }

                }

                if (maxIndexT >= 0) {
                    // console.log('maxIndexT', maxIndexT, maxTolerance);
                    maxIndices.push(maxIndexT);
                }


            }

            if (maxIndices.length === 0) {
                // console.log('break @', iteration)
                break;
            }
            indices.push(...maxIndices);
            indices = indices.sort((a, b) => a - b);
            // console.log('indices', indices);

        }

        return indices;

    }

    // static findTurningIndices(values: number[]): number[] {

    //     const turningIndices: number[] = [];
    //     let value01: number;
    //     let value12: number;
    //     for (let i=2; i<values.length; i++) {
    //         value01 = values[i - 0] - values[i - 1];
    //         value12 = values[i - 1] - values[i - 2];
    //         if (value01 > 0 !== value12 > 0) {
    //             turningIndices.push(i);
    //         }
    //     }
    //     return turningIndices;

    // }


}