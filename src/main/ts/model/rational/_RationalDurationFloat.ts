// import { TimeUtil } from './../../util/TimeUtil';
// import { IRational } from './IRational';

// /**
//  * implementation of IRational for a specific duration
//  *
//  * @author h.fleischer
//  * @since 16.05.2021
//  */
// export class RationalDurationFloat implements IRational {

//     private readonly durations: { [K in number]: number};
//     private minKey: number;
//     private maxKey: number;
//     private readonly minVal: number;
//     private readonly maxVal: number;
//     private keys: number[];

//     constructor(durations: { [K in number]: number }) {
//         this.durations = durations;
//         this.minKey = Number.MAX_SAFE_INTEGER;
//         this.maxKey = Number.MIN_SAFE_INTEGER;
//         this.keys = []
//         let numKey: number;
//         for (let key in durations) {
//             numKey = parseInt(key);
//             this.keys.push(numKey);
//             this.minKey = Math.min(this.minKey, numKey);
//             this.maxKey = Math.max(this.maxKey, numKey);
//         }
//         this.minVal = durations[this.minKey];
//         this.maxVal = durations[this.maxKey];
//     }

//     getDuration(): number {
//         return -1;
//     }

//     getRate(dT: number, tT: number): number {

//         let duration = this.minVal;
//         if (tT > this.maxKey) {
//             duration = this.maxVal;
//         } else if (tT > this.minKey) {
//             let keyA = this.minKey;
//             for (let keyIndex = 0; keyIndex < this.keys.length; keyIndex++) {
//                 let keyB = this.keys[keyIndex];
//                 if (tT > keyA && tT <= keyB) {
//                     let diffF = (tT - keyA) / (keyB - keyA);
//                     duration = this.durations[keyA] + (this.durations[keyB] - this.durations[keyA]) * diffF;
//                     if (tT % TimeUtil.MILLISECONDS_PER____DAY === 0) {
//                         console.log('_', TimeUtil.formatCategoryDate(tT), diffF, this.durations[keyA] / TimeUtil.MILLISECONDS_PER____DAY, ' >> ', this.durations[keyB] / TimeUtil.MILLISECONDS_PER____DAY);
//                     }
//                     break;
//                 }
//                 keyA = keyB;
//             }

//         }


//         return duration !== 0 ? dT / duration : 0;

//     }

// }