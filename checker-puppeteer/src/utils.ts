import { Dictionary } from 'crawlee';
import type { ActorCheckDetailedOutput, ActorCheckSimplifiedOutput } from './typedefs.js';

export function convertDetailedOutputToSimplified(data: ActorCheckDetailedOutput): ActorCheckSimplifiedOutput {
    const obj: Dictionary = {};

    for (const [key, value] of Object.entries(data)) {
        if (Array.isArray(value)) {
            obj[key] = value.length;
        } else if (typeof value === 'object') {
            if (!obj[key]) {
                obj[key] = {};
            }
            const nestedObject: Dictionary = obj[key];

            for (const [statusCode, statusValue] of Object.entries(value)) {
                nestedObject[statusCode] = (statusValue as any).length;
            }
        } else {
            obj[key] = value;
        }
    }

    // @ts-expect-error We are merging the objects
    return obj;
}