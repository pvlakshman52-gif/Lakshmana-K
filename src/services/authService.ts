import { User, UserRole } from '../types/erp';

export interface AuthSession {
  token: string;
  user: User;
  expiresAt: number;
}

export class AuthorizationError extends Error {
  constructor(message: string, public code: string = 'FORBIDDEN') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Server-Side Authorization & Authentication Service
 * Shared contract for Web SPA, Mobile PWA, and Future Native Mobile Applications
 */
export class AuthService {
  /**
   * Enforces branch-level data access restrictions.
   * If a Staff user assigned to Hospete tries to request Hubballi data, this rejects with 403 Forbidden.
   */
  static authorizeLocationAccess(user: User, requestedLocationId: string | 'ALL'): string {
    if (!user) {
      throw new AuthorizationError('Authentication required.', 'UNAUTHENTICATED');
    }

    if (user.role === 'Admin') {
      // Admins have global multi-branch visibility
      return requestedLocationId;
    }

    // Staff / Cashier / Doctor: Strictly locked to their assigned clinic branch
    if (requestedLocationId === 'ALL') {
      throw new AuthorizationError(
        `Access Denied: Users with role "${user.role}" are restricted to their assigned branch (${user.locationId}). Consolidated multi-branch view is restricted to Administrators only.`,
        'BRANCH_ACCESS_DENIED'
      );
    }

    if (user.locationId && user.locationId !== requestedLocationId) {
      throw new AuthorizationError(
        `Access Denied: Your account is assigned to clinic "${user.locationId}". You are not authorized to view or manipulate data for clinic "${requestedLocationId}".`,
        'CROSS_BRANCH_FORBIDDEN'
      );
    }

    return user.locationId;
  }

  /**
   * Validates if a user has administrative privileges for sensitive operations
   * (Go Live system reset, pricing mode switch, bulk opening stock clearing, etc.)
   */
  static requireAdmin(user: User): void {
    if (!user || user.role !== 'Admin') {
      throw new AuthorizationError('This action requires Administrator authorization.', 'ADMIN_REQUIRED');
    }
  }
}
