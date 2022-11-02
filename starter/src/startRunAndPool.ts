import { Actor } from 'apify';

import type { PreparedActorConfig, ActorCheckSimplifiedOutput } from './typedefs.js';

export async function startRun(run: PreparedActorConfig) {
    const client = Actor.newClient();
    const result = await client.actor(run.actorId).start(run.input, run.params);

    return result;
}

export async function waitForRunToFinishAndPushData(runConfig: PreparedActorConfig) {
    const client = Actor.newClient();
    const run = client.run(runConfig.runId!);

    const finishedRun = await run.waitForFinish();
    const { computeUnits } = finishedRun.stats;

    const value = (await run.keyValueStore().getRecord('OUTPUT'))!.value as ActorCheckSimplifiedOutput;

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

    await Actor.pushData(value);
}
