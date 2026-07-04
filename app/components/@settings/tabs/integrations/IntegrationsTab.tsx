import { classNames } from '~/utils/classNames';
import GitHubTab from '~/components/@settings/tabs/github/GitHubTab';
import LinearTab from '~/components/@settings/tabs/linear/LinearTab';
import CloudProvidersTab from '~/components/@settings/tabs/providers/cloud/CloudProvidersTab';
import LocalProvidersTab from '~/components/@settings/tabs/providers/local/LocalProvidersTab';
import McpTab from '~/components/@settings/tabs/mcp/McpTab';

/*
 * One category per piece of the eng stack, one or two best-in-class
 * providers each — not broad, shallow coverage. See project memory
 * `project_integration_philosophy`.
 */
function Category({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className={classNames('text-xs font-mono uppercase tracking-wide text-bolt-elements-textTertiary mb-3')}>
        {label}
      </div>
      {children}
    </div>
  );
}

export default function IntegrationsTab() {
  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <Category label="Source control">
        <GitHubTab />
      </Category>

      <div className="border-t border-bolt-elements-borderColor" />

      <Category label="Issue tracking">
        <LinearTab />
      </Category>

      <div className="border-t border-bolt-elements-borderColor" />

      <Category label="AI models">
        <div className="space-y-8">
          <CloudProvidersTab />
          <LocalProvidersTab />
        </div>
      </Category>

      <div className="border-t border-bolt-elements-borderColor" />

      <Category label="Developer tools">
        <McpTab />
      </Category>
    </div>
  );
}
