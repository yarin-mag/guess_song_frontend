
import type { Session } from '@clerk/clerk-sdk-node';

declare global {
  namespace App {
    interface Locals {
      user: Session | null;
    }
  }
}
