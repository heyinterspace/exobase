import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { withSecurity } from '~/lib/security';
import { coolifyFetch, normalizeCoolifyUrl } from '~/lib/api/coolify.server';

interface DeployRequest {
  serverUrl?: string;
  token?: string;
  gitRepository?: string;
  gitBranch?: string;
  appName?: string;
  appUuid?: string;
}

interface CoolifyServer {
  uuid: string;
  name: string;
}

interface CoolifyProject {
  uuid: string;
  name: string;
}

interface CoolifyEnvironment {
  id: number;
  uuid?: string;
  name: string;
}

interface CoolifyApplication {
  uuid: string;
  fqdn?: string | null;
}

/**
 * Creates (first deploy) or redeploys (subsequent) a Coolify application
 * backed by the GitHub repo the client just pushed. Coolify can only build
 * from a git source, so the client is responsible for the push; this route
 * only drives Coolify's REST API. The instance URL and token are
 * user-supplied (self-hosted) and never stored server-side.
 */
async function coolifyDeployAction({ request }: ActionFunctionArgs) {
  const body = (await request.json().catch(() => ({}))) as DeployRequest;
  const { token, gitRepository, gitBranch = 'main', appName, appUuid } = body;

  if (!body.serverUrl || !token) {
    return json({ error: 'Connect Coolify in Settings first' }, { status: 401 });
  }

  let baseUrl: string;

  try {
    baseUrl = normalizeCoolifyUrl(body.serverUrl);
  } catch {
    return json({ error: 'Invalid Coolify instance URL' }, { status: 400 });
  }

  try {
    let uuid = appUuid;
    let deploymentUuid: string | undefined;

    if (uuid) {
      // Existing app: Coolify pulls the branch fresh, so a redeploy is one call.
      const result = await coolifyFetch<{ message: string; deployment_uuid?: string }>(`/applications/${uuid}/start`, {
        baseUrl,
        token,
      });
      deploymentUuid = result.deployment_uuid;
    } else {
      if (!gitRepository) {
        return json({ error: 'gitRepository is required for a first deploy' }, { status: 400 });
      }

      /*
       * First deploy: Coolify needs a target server + project + environment.
       * Opinionated defaults — first server, first project (created if the
       * instance has none), that project's first environment. No pickers.
       */
      const servers = await coolifyFetch<CoolifyServer[]>('/servers', { baseUrl, token });

      if (!servers.length) {
        return json({ error: 'No servers found on this Coolify instance' }, { status: 400 });
      }

      let projects = await coolifyFetch<CoolifyProject[]>('/projects', { baseUrl, token });

      if (!projects.length) {
        await coolifyFetch('/projects', {
          baseUrl,
          token,
          method: 'POST',
          body: { name: 'exobase-apps', description: 'Apps deployed from Exobase' },
        });
        projects = await coolifyFetch<CoolifyProject[]>('/projects', { baseUrl, token });
      }

      const project = projects[0];
      const projectDetail = await coolifyFetch<{ environments?: CoolifyEnvironment[] }>(`/projects/${project.uuid}`, {
        baseUrl,
        token,
      });
      const environment = projectDetail.environments?.[0];

      if (!environment) {
        return json({ error: 'The Coolify project has no environments' }, { status: 400 });
      }

      const created = await coolifyFetch<{ uuid: string }>('/applications/public', {
        baseUrl,
        token,
        method: 'POST',
        body: {
          project_uuid: project.uuid,
          server_uuid: servers[0].uuid,
          environment_name: environment.name,
          ...(environment.uuid ? { environment_uuid: environment.uuid } : {}),
          git_repository: gitRepository,
          git_branch: gitBranch,
          build_pack: 'nixpacks',
          ports_exposes: '3000',
          name: appName || 'exobase-app',
          instant_deploy: true,
        },
      });

      uuid = created.uuid;
    }

    // Best-effort URL lookup; Coolify assigns an fqdn (wildcard/sslip.io) on create.
    let url: string | undefined;

    try {
      const app = await coolifyFetch<CoolifyApplication>(`/applications/${uuid}`, { baseUrl, token });
      url = app.fqdn?.split(',')[0] || undefined;
    } catch {
      // Non-fatal: deploy is running either way.
    }

    return json({ appUuid: uuid, deploymentUuid, url });
  } catch (error) {
    console.error('Coolify deploy failed:', error);

    return json({ error: error instanceof Error ? error.message : 'Coolify deployment failed' }, { status: 502 });
  }
}

export const action = withSecurity(coolifyDeployAction, {
  allowedMethods: ['POST'],
});
