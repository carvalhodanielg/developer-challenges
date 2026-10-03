// Importing env first validates the environment, so a misconfigured API
// exits at boot instead of failing on the first request.
import { env } from './config/env';

console.log(
  `Dynapredict API configured for ${env.NODE_ENV} (port ${env.PORT})`,
);
