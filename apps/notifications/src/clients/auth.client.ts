import { createLogger } from '@okaz/shared';

import { notificationsConfig } from '../config/notifications.config.js';

const logger = createLogger('notifications-auth-client');

/**
 * Fetches the ids of every staff member (STORE_MANAGER / ADMIN) from the auth
 * service via its internal, secret-guarded endpoint. Used to fan out "order placed"
 * notifications to the people who can act on them. Best-effort: returns [] on failure.
 */
export const fetchStaffIds = async (requestId: string): Promise<string[]> => {
  try {
    const url = new URL('/internal/staff', notificationsConfig.authServiceUrl);
    const response = await fetch(url, {
      headers: {
        'x-request-id': requestId,
        'x-internal-secret': notificationsConfig.internalServiceSecret
      }
    });

    if (!response.ok) {
      logger.warn('staff_fetch_failed', { status: response.status, requestId });
      return [];
    }

    const body = (await response.json()) as { data?: Array<{ id: string }> };
    return (body.data ?? []).map((staff) => staff.id);
  } catch (error) {
    logger.warn('staff_fetch_error', {
      requestId,
      message: error instanceof Error ? error.message : 'unknown'
    });
    return [];
  }
};
