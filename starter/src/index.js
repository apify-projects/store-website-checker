import Apify from 'apify';
import { inspect } from 'util';
import { convertInputToActorConfigs } from './lib/configs.js';
import { waitForRunToFinishAndPushData, startRun } from './lib/startRunAndPool.js';

const { log, sleep } = Apify.utils;
const env = Apify.getEnv();

Apify.main(async () => {
    /** @type {import('../../common/types').ActorInputData} */
    // @ts-ignore It's not null
    const input = await Apify.getInput();
    log.debug('Provided inputs:');
    log.debug(inspect(input));

    const { maxConcurrentDomainsChecked, urlsToCheck } = input;

    // Log the input
    log.info('Input provided:');
    log.debug(inspect(input, false, 4));

    /** @type {import('./types').FrontendActorState} */
    // @ts-expect-error It's an object
    const state = await Apify.getValue('STATE') ?? {
        runConfigurations: [],
        totalUrls: urlsToCheck.length,
        checkerFinished: false,
    };

    Apify.events.on('migrating', async () => {
        await Apify.setValue('STATE', state);
    });

    Apify.events.on('persistState', async () => {
        await Apify.setValue('STATE', state);
    });

    setInterval(async () => {
        await Apify.setValue('STATE', state);

        log.debug('Internal state:');
        log.debug(inspect(state, false, 3));
    }, 10_000);

    // If we haven't initialized the state yet, do it now
    if (state.runConfigurations.length === 0 && !state.checkerFinished) {
        state.runConfigurations = convertInputToActorConfigs(input);
    }

    // Sort state based on started runs
    state.runConfigurations = state.runConfigurations.sort((_, b) => Number(Boolean(b.runId)));
    await Apify.setValue('STATE', state);

    log.info(`Preparing to process ${state.totalUrls} URLs...\n`);

    /** @type {import('apify').RequestOptions[]} */
    const sources = state.runConfigurations.map((actorInput, index) => ({
        url: 'https://localhost',
        uniqueKey: index.toString(),
        userData: { actorInput },
    }));

    const requestList = await Apify.openRequestList(null, sources);

    const runner = new Apify.BasicCrawler({
        maxConcurrency: maxConcurrentDomainsChecked,
        requestList,
        handleRequestFunction: async ({ request }) => {
            const { uniqueKey, userData } = request;
            /** @type {{ actorInput: import('../../common/types').PreparedActorConfig }} */
            // @ts-expect-error JS-style casting
            const { actorInput } = userData;

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
                // TODO(vladfrangu): remove this once I confirm the value is updated, so we don't restart runs for no reason
                console.log(state.runConfigurations[Number(uniqueKey)]);
            }

            // Wait for the run to finish
            await waitForRunToFinishAndPushData(actorInput);
        },
    });

    // Run the checker
    await runner.run();

    // Save the state as done, to prevent resurrection doing requests it doesn't have to do
    state.runConfigurations = [];
    state.checkerFinished = true;
    await Apify.setValue('STATE', state);

    log.info(`\nChecking ${state.totalUrls} URLs completed!`);
    log.info(`Please go to https://api.apify.com/v2/datasets/${env.defaultDatasetId}/items?clean=true&format=html to see the results`);
    log.info(`Go to https://api.apify.com/v2/datasets/${env.defaultDatasetId}/items?clean=true&format=json for the JSON output`);
});
