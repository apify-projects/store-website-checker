// TODO: move these to the actors that run the checking themselves

/**
 * @param {import('./types').ActorCheckDetailedOutput} data
 * @return {import('./types').ActorCheckSimplifiedOutput}
 */
export function convertDetailedOutputToSimplified(data) {
    /** @type {Record<string, any>} */
    const obj = {};

    for (const [key, value] of Object.entries(data)) {
        if (Array.isArray(value)) {
            obj[key] = value.length;
        } else if (typeof value === 'object') {
            /** @type {Record<string, number>} */
            // eslint-disable-next-line no-multi-assign
            const nestedObject = obj[key] = {};

            for (const [statusCode, statusValue] of Object.entries(value)) {
                nestedObject[statusCode] = statusValue.length;
            }
        } else {
            obj[key] = value;
        }
    }

    // @ts-expect-error We are merging the objects
    return obj;
}
