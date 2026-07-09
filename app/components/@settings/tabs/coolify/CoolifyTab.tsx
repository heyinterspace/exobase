import { CoolifyConnection } from './components/CoolifyConnection';

export default function CoolifyTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="i-ph:cloud-arrow-up w-5 h-5 text-bolt-elements-textPrimary" />
        <h2 className="text-lg font-medium text-bolt-elements-textPrimary">Coolify Integration</h2>
      </div>

      <p className="text-sm text-bolt-elements-textSecondary">
        Connect your self-hosted Coolify instance to deploy apps with one click. Exobase pushes your project to GitHub
        and Coolify builds and hosts it from there, so connect GitHub first.
      </p>

      <CoolifyConnection />
    </div>
  );
}
