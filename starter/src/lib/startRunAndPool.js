import { newClient, pushData } from 'apify';

/** @type {import('apify-client').ApifyClient} */
const client = newClient();

/**
 * @param {import('../../../common/types').PreparedActorConfig} run
 */
export async function startRun(run) {
    const result = await client.actor(run.actorId).start(run.input, run.params);

    return result;
}

/**
 * @param {import('../../../common/types').PreparedActorConfig} runConfig
 * @param {string} runId
 */
export async function waitForRunToFinish(runConfig, runId) {
    const run = client.run(runId);

    const finishedRun = await run.waitForFinish();
    const { computeUnits } = finishedRun.stats;

    const output = await run.keyValueStore().getRecord('OUTPUT');

    /** @type {{ value: import('../../../common/types').ActorCheckSimplifiedOutput }} */
    // @ts-expect-error Casting to known type
    const { value } = output;

    value.computeUnitsUsedForThisCheck = Number(computeUnits.toFixed(4));
    value.pagesPerComputeUnit = Number((value.totalPages / computeUnits).toFixed(2));
    value.proxyUsed = runConfig.proxyUsed;

    if (runConfig.input['playwright.chrome']) {
        value.playwrightBrowser = 'chrome';
    } else if (runConfig.input['playwright.firefox']) {
        value.playwrightBrowser = 'firefox';
    } else if (runConfig.input['playwright.webkit']) {
        value.playwrightBrowser = 'webkit';
    }

    await pushData(value);
}
