import { redirect } from 'next/navigation';

export default function ExploreAlias() {
  // keep old links working, but send users to the chat flow
  redirect('/chat');
}
