import * as stytch from 'stytch';

let client: stytch.Client | null = null;

export function getStytchClient(): stytch.Client {
  if (!client) {
    const projectId = process.env.STYTCH_PROJECT_ID!;
    const isTestEnv = projectId.includes('-test-');

    client = new stytch.Client({
      project_id: projectId,
      secret: process.env.STYTCH_SECRET!,
      env: isTestEnv ? stytch.envs.test : stytch.envs.live,
    });
  }
  return client;
}
