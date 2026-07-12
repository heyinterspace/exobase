import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { withSecurity } from '~/lib/security';
import {
  coolifyFetch,
  getManagedHostingConfig,
  normalizeCoolifyUrl,
  type ManagedHostingConfig,
} from '~/lib/api/coolify.server';
import { parseCookies } from '~/lib/api/cookies';
import { ANON_ID_COOKIE } from '~/lib/anonId';

interface DeployRequest {
  mode?: 'managed' | 'byo';
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
  name?: string;
  fqdn?: string | null;
}

/*
 * Managed-hosting guardrails, pre-identity. The anon cookie is spoofable, so
 * these are speed bumps against casual abuse, not a security boundary — real
 * per-account quotas land with Phase 2's identity work. Defense in depth here
 * is the per-IP rate limit on this route (security.ts) plus hard resource
 * caps on every container Coolify creates for us.
 */
const MANAGED_MAX_APPS_PER_USER = 3;
const MANAGED_LIMITS = { limits_memory: '512m', limits_cpus: '0.5' };

function managedAppPrefix(anonId: string) {
  return `exo-${anonId.replace(/-/g, '').slice(0, 8)}-`;
}

/**
 * Creates (first deploy) or redeploys (subsequent) a Coolify application
 * backed by the GitHub repo the client just pushed. Two modes:
 *
 * - managed (default UX: "Deploy on Exobase"): targets the Exobase-operated
 *   instance from server-only env vars; apps are namespaced per anonymous
 *   user and capped. The token never exists client-side.
 * - byo: the user's own instance, URL + token supplied from their browser
 *   (stored client-side only; proxied through here to dodge CORS).
 */
async function coolifyDeployAction({ request, context }: ActionFunctionArgs) {
  const body = (await request.json().catch(() => ({}))) as DeployRequest;
  const { gitRepository, gitBranch = 'main', appName, appUuid } = body;
  const mode = body.mode === 'byo' ? 'byo' : 'managed';

  let baseUrl: string;
  let token: string;
  let namePrefix = '';

  if (mode === 'managed') {
    const managed: ManagedHostingConfig | null = getManagedHostingConfig(context);

    if (!managed) {
      return json({ error: 'Managed hosting is not configured on this server' }, { status: 501 });
    }

    const anonId = parseCookies(request.headers.get('Cookie'))[ANON_ID_COOKIE];

    if (!anonId) {
      return json({ error: 'Missing user id cookie; reload and try again' }, { status: 400 });
    }

    baseUrl = managed.baseUrl;
    token = managed.token;
    namePrefix = managedAppPrefix(anonId);
  } else {
    if (!body.serverUrl || !body.token) {
      return json({ error: 'Connect Coolify in Settings first' }, { status: 401 });
    }

    try {
      baseUrl = normalizeCoolifyUrl(body.serverUrl);
    } catch {
      return json({ error: 'Invalid Coolify instance URL' }, { status: 400 });
    }

    token = body.token;
  }

  try {
    let uuid = appUuid;
    let deploymentUuid: string | undefined;

    if (uuid) {
      if (mode === 'managed') {
        // Only allow redeploying apps in this anon user's namespace.
        const app = await coolifyFetch<CoolifyApplication>(`/applications/${uuid}`, { baseUrl, token });

        if (!app.name?.startsWith(namePrefix)) {
          return json({ error: 'This app does not belong to you' }, { status: 403 });
        }
      }

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

      if (mode === 'managed') {
        const existing = await coolifyFetch<CoolifyApplication[]>('/applications', { baseUrl, token });
        const mine = existing.filter((app) => app.name?.startsWith(namePrefix));

        if (mine.length >= MANAGED_MAX_APPS_PER_USER) {
          return json(
            { error: `Hosting is limited to ${MANAGED_MAX_APPS_PER_USER} apps per user right now` },
            { status: 403 },
          );
        }
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
          name: `${namePrefix}${appName || 'app'}`.slice(0, 60),
          instant_deploy: true,

          // Hard per-container caps on shared infrastructure; harmless on BYO.
          ...(mode === 'managed' ? MANAGED_LIMITS : {}),
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

    return json({ error: error instanceof Error ? error.message : 'Deployment failed' }, { status: 502 });
  }
}

export const action = withSecurity(coolifyDeployAction, {
  allowedMethods: ['POST'],
});
