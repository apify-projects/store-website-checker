import { newClient, pushData } from 'apify';
import { actorIdToCheckerType } from './constants';

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
    const { value } = output;

    value.computeUnitsUsedForThisCheck = Number(computeUnits.toFixed(4));
    value.pagesPerComputeUnit = Number((value.totalPages / computeUnits).toFixed(2));
    value.proxyUsed = runConfig.proxyUsed;
    value.checkerType = actorIdToCheckerType(runConfig.actorId);

    await pushData(value);
}
