import { Actor } from 'apify';
import { log, RequestList, BasicCrawler } from 'crawlee';

import { inspect } from 'util';
import { convertInputToActorConfigs } from './configs.js';
import { waitForRunToFinishAndPushData, startRun } from './startRunAndPool.js';

import type { ActorInputData, FrontendActorState, PreparedActorConfig } from './typedefs.js';

const env = Actor.getEnv();

Actor.main(async () => {
    const input = await Actor.getInput() as ActorInputData;
    log.debug('Provided inputs:');
    log.debug(inspect(input));

    // TODO: Add utilization of all user memory instead of having to rely on maxConcurrentDomainsChecked
    const { maxConcurrentDomainsChecked, urlsToCheck } = input;

    // Log the input
    log.info('Input provided:');
    log.debug(inspect(input, false, 4));

    const state: FrontendActorState = await Actor.getValue('STATE') ?? {
        runConfigurations: [],
        totalUrls: urlsToCheck.length,
        checkerFinished: false,
    };

    Actor.on('persistState', async () => {
        await Actor.setValue('STATE', state);
    });

    // If we haven't initialized the state yet, do it now
    if (state.runConfigurations.length === 0 && !state.checkerFinished) {
        state.runConfigurations = convertInputToActorConfigs(input);
    }

    // Sort state based on started runs
    state.runConfigurations = state.runConfigurations.sort((_, b) => Number(Boolean(b.runId)));
    await Actor.setValue('STATE', state);

    log.info(`Preparing to process ${state.totalUrls} URLs...\n`);

    const sources = state.runConfigurations.map((actorInput, index) => ({
        url: 'https://localhost',
        uniqueKey: index.toString(),
        userData: { actorInput },
    }));

    const requestList = await RequestList.open(null, sources);

    const runner = new BasicCrawler({
        maxConcurrency: maxConcurrentDomainsChecked,
        requestList,
        requestHandler: async ({ request }) => {
            const { userData } = request;
            const actorInput = (userData.actorInput) as PreparedActorConfig;

            if (actorInput.runId) {
                log.info(`Found run ${actorInput.runId} with actor ${actorInput.actorId} for URL "${actorInput.url}" - waiting for it to finish.`);
                log.info(`You can monitor the status of the run by going to https://console.apify.com/actors/runs/${actorInput.runId}`);
            } else {
                const result = await startRun(actorInput);
                log.info(
                    `Starting run for "${actorInput.url}" with actor ${actorInput.actorId} and ${
                        actorInput.input.proxyConfiguration.useApifyProxy ? `proxy ${actorInput.proxyUsed ?? 'auto'}` : 'no proxy'
                    }.`,
                );
                log.info(`You can monitor the status of the run by going to https://console.apify.com/actors/runs/${result.id}`);
                actorInput.runId = result.id;
            }

            // Wait for the run to finish
            await waitForRunToFinishAndPushData(actorInput);
        },
        requestHandlerTimeoutSecs: 999_999,
    });

    // Run the checker
    await runner.run();

    // Save the state as done, to prevent resurrection doing requests it doesn't have to do
    state.runConfigurations = [];
    state.checkerFinished = true;
    await Actor.setValue('STATE', state);

    log.info(`\nChecking ${state.totalUrls} URLs completed!`);
    log.info(`Please go to https://api.apify.com/v2/datasets/${env.defaultDatasetId}/items?clean=true&format=html to see the results`);
    log.info(`Go to https://api.apify.com/v2/datasets/${env.defaultDatasetId}/items?clean=true&format=json for the JSON output`);
});
