
import { Clerk } from '@clerk/clerk-sdk-node';
import { CLERK_SECRET_KEY } from '$env/static/private';
import type { Handle } from '@sveltejs/kit';

const clerk = Clerk({ secretKey: CLERK_SECRET_KEY });

export const handle: Handle = async ({ event, resolve }) => {
  const sessionId = event.cookies.get('__session');
  if (!sessionId) {
    event.locals.user = null;
    return resolve(event);
  }

  try {
    const session = await clerk.sessions.getSession(sessionId);
    event.locals.user = session;
  } catch (e) {
    event.locals.user = null;
  }

  return resolve(event);
};
