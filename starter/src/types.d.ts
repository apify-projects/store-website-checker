import { PreparedActorConfig } from '../../common/types';

export interface FrontendActorState {
    totalUrls: number;
    preparedConfigs: PreparedActorConfig[][];
    pendingConfigs: PreparedActorConfig[][];
}
