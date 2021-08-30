import Apify from 'apify';
import { startRun, waitForRunToFinish } from './startRunAndPool';

const { log, sleep } = Apify.utils;

/**
 * @param {import('../types').FrontendActorState} state
 */
export async function revivePendingConfigs(state) {
    const promises = [];

    for (const domainRunConfigs of state.pendingConfigs) {
        for (const run of domainRunConfigs) {
            if (run.runId) {
                log.info([
                    `Recovered run ${run.runId} after actor crash - waiting for it to finish.`,
                    `You can monitor the status of the run by going to https://console.apify.com/actors/runs/${run.runId}`,
                ].join('\n'));
                promises.push(waitForRunToFinish(run, run.runId));
            } else {
                const result = await startRun(run);
                log.info(`Starting run for "${run.url}" with actor ${run.actorId} and proxy ${run.proxyUsed ?? 'auto'}.`);
                log.info(`You can monitor the status of the run by going to https://console.apify.com/actors/runs/${result.id}`);
                run.runId = result.id;
                await Apify.setValue('STATE', state);

                // Start pooling the run for its results
                promises.push(waitForRunToFinish(run, result.id));

                // Wait a second to not overload the platform
                await sleep(1000);
            }
        }
    }

    await Promise.allSettled(promises);
}
