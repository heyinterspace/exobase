import { json, redirect, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat';
import { Chat } from '~/components/chat/Chat.client';
import { Header } from '~/components/header/Header';
import BackgroundRays from '~/components/ui/BackgroundRays';
import { parseCookies } from '~/lib/api/cookies';
import { WAITLIST_ACCESS_COOKIE } from '~/routes/api.waitlist';

export const meta: MetaFunction = () => {
  return [{ title: 'Exobase' }, { name: 'description', content: 'Talk with Exobase, your BYO-model AI app builder' }];
};

/*
 * Pre-launch: the builder is gated behind waitlist signup (see /waitlist and
 * api.waitlist.ts) rather than open to anyone with the URL.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const cookies = parseCookies(request.headers.get('Cookie'));

  if (!cookies[WAITLIST_ACCESS_COOKIE]) {
    return redirect('/waitlist');
  }

  return json({});
}

/**
 * Landing page component for Exobase
 */
export default function Index() {
  return (
    <div className="flex flex-col h-full w-full bg-bolt-elements-background-depth-1">
      <BackgroundRays />
      <Header />
      <ClientOnly fallback={<BaseChat />}>{() => <Chat />}</ClientOnly>
    </div>
  );
}
