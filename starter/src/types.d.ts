import { PreparedActorConfig } from '../../common/types';

export interface FrontendActorState {
    totalUrls: number;
    runConfigurations: PreparedActorConfig[];
    checkerFinished: boolean;
}
