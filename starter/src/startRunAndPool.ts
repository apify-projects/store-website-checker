import { Actor, ActorRun } from 'apify';

import { DEFAULT_COSTS } from './constants.js';
import type { PreparedActorConfig, ActorCheckSimplifiedOutput, FixedActorRun } from './typedefs.js';

export async function startRun(run: PreparedActorConfig) {
    const client = Actor.newClient();
    const result = await client.actor(run.actorId).start(run.input, run.params);

    return result;
}

export async function waitForRunToFinishAndPushData(runConfig: PreparedActorConfig) {
    const client = Actor.newClient();
    const run = client.run(runConfig.runId!);

    const finishedRun = await run.waitForFinish() as FixedActorRun;
    const {
        ACTOR_COMPUTE_UNITS: computeUnits,
        PROXY_RESIDENTIAL_TRANSFER_GBYTES: residentialGBs,
    } = finishedRun.usage;

    const value = (await run.keyValueStore().getRecord('OUTPUT'))!.value as ActorCheckSimplifiedOutput;

    value.computeUnitsUsedForThisCheck = Number(computeUnits.toFixed(4));
    value.pagesPerComputeUnit = Number((value.totalPages / computeUnits).toFixed(2));
    value.computeUnitsPerRequest = Number((computeUnits / value.totalPages).toFixed(6));
    // 8 decimals gives all the precision we need (level of 10 Bytes)
    value.residentialGBs = Number(residentialGBs.toFixed(8));
    value.residentialGBsPerRequest = Number((residentialGBs / value.totalPages).toFixed(8));
    value.proxyUsed = runConfig.proxyUsed;
    value.estimatedCost = Number((computeUnits * DEFAULT_COSTS.COMPUTE_UNIT + residentialGBs * DEFAULT_COSTS.RESIDENTIAL_GB).toFixed(4));
    value.estimatedCostPerRequest = Number((value.estimatedCost / value.totalPages).toFixed(6));

    if (runConfig.input['playwright.chrome']) {
        value.playwrightBrowser = 'chrome';
    } else if (runConfig.input['playwright.firefox']) {
        value.playwrightBrowser = 'firefox';
    } else if (runConfig.input['playwright.webkit']) {
        value.playwrightBrowser = 'webkit';
    }

    value.successRate = Number(((value.success / value.totalPages) * 100).toFixed(2));
    value.runUrl = `https://console.apify.com/actors/runs/${runConfig.runId}`;

    await Actor.pushData(value);
}
