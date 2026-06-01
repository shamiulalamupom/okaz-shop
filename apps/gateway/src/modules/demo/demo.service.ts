import type { UserContext } from '@okaz/shared';

export const demoService = {
  buildProtectedResponse(user: UserContext) {
    return {
      message: 'Protected resource',
      user
    };
  },

  buildAdminResponse(user: UserContext) {
    return {
      message: 'Admin resource',
      user
    };
  }
};
