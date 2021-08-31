import Apify from 'apify';
import { inspect } from 'util';
import { convertInputToActorConfigs } from './lib/configs.js';
import { revivePendingConfigs } from './lib/revivePendingConfigs.js';
import { waitForRunToFinish, startRun } from './lib/startRunAndPool.js';

const { log, sleep } = Apify.utils;
const env = Apify.getEnv();

Apify.main(async () => {
    /** @type {import('../../common/types').ActorInputData} */
    // @ts-ignore It's not null
    const input = await Apify.getInput();

    // Log the input
    log.info('Input provided:');
    log.debug(inspect(input, false, 4));

    /** @type {import('./types').FrontendActorState} */
    // @ts-expect-error It's an object
    const state = await Apify.getValue('STATE') ?? {
        preparedConfigs: [],
        pendingConfigs: [],
        totalUrls: 0,
    };

    Apify.events.on('migrating', async () => {
        await Apify.setValue('STATE', state);
    });

    setInterval(async () => {
        await Apify.setValue('STATE', state);

        log.debug('Internal state:');
        log.debug(inspect(state, false, 3));
    }, 10_000);

    state.preparedConfigs = convertInputToActorConfigs(input);
    state.totalUrls = input.urlsToCheck.length;

    log.info(`Preparing to process ${state.totalUrls} URLs...`);

    // Check for revivals first, in the event the actor crashed, and handle those to the end
    await revivePendingConfigs(state);

    const { maxConcurrentDomainsChecked } = input;

    while (true) {
        // Each element of domainsToCheck represents a URL with its own run configurations
        const domainsToCheck = state.preparedConfigs.splice(0, maxConcurrentDomainsChecked);
        // If we got no more URLs to run, exit the loop
        if (domainsToCheck.length === 0) break;

        log.info(`Starting a batch of ${domainsToCheck.length} URLs to check`);

        state.pendingConfigs = domainsToCheck;
        // Save the state right off the bat, in the event the actor dies right after
        await Apify.setValue('STATE', state);

        const promises = [];

        for (const domainRunConfigs of domainsToCheck) {
            for (const run of domainRunConfigs) {
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

        // Await all runs to finish before continuing
        await Promise.allSettled(promises);
    }

    log.info(`Checking ${state.totalUrls} URLs completed!`);
    log.info(`Please go to https://api.apify.com/v2/datasets/${env.defaultDatasetId}/items?clean=true&format=html to see the results`);
    log.info(`Go to https://api.apify.com/v2/datasets/${env.defaultDatasetId}/items?clean=true&format=json for the JSON output`);
});
