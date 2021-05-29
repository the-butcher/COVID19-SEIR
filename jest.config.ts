import type {Config} from '@jest/types';

// // Or async function
// export default async (): Promise<Config.InitialOptions> => {
//   return {
//     verbose: true,
//     testMatch: ["**/__tests__/**/*.ts" ]
//   };
// };

export default async (): Promise<Config.InitialOptions> => {
  return {
    preset: 'ts-jest',
    verbose: true,
    testMatch: ["**/__tests__/**/*.ts" ]
  };
};

// module.exports = {
//   preset: 'ts-jest',
//   globals: {
//     'ts-jest': {
//       diagnostics: false
//     }
//   }
// };