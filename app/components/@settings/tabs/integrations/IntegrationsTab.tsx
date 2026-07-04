import { classNames } from '~/utils/classNames';
import GitHubTab from '~/components/@settings/tabs/github/GitHubTab';
import LinearTab from '~/components/@settings/tabs/linear/LinearTab';

/*
 * Only providers with a real one-click connect flow live here — no menu
 * items for integrations we haven't actually built yet. Build up from
 * first principles: GitHub and Linear today, more added only once each
 * has its own one-click interface. See project memory
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
    </div>
  );
}
