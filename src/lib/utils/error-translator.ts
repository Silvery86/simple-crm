/**
 * Purpose: Convert API and Firebase error codes to i18n translation keys for bilingual support.
 */

/**
 * Purpose: Map error codes to translation keys for consistent error messaging.
 * Params:
 *   - errorCode: string | number — Error code from API or Firebase
 * Returns:
 *   - string — Translation key (e.g., 'errors.auth.invalidEmail')
 * Throws:
 *   - N/A
 */
export function getErrorTranslationKey(errorCode: string | number): string {
  const errorMap: Record<string | number, string> = {
    // Firebase Auth Errors
    'auth/invalid-email': 'errors.auth.invalidEmail',
    'auth/user-disabled': 'errors.auth.userDisabled',
    'auth/user-not-found': 'errors.auth.userNotFound',
    'auth/wrong-password': 'errors.auth.wrongPassword',
    'auth/email-already-in-use': 'errors.auth.emailExists',
    'auth/weak-password': 'errors.auth.weakPassword',
    'auth/operation-not-allowed': 'errors.auth.operationNotAllowed',
    'auth/too-many-requests': 'errors.auth.tooManyRequests',
    'auth/invalid-credential': 'errors.auth.invalidCredential',
    'auth/popup-closed-by-user': 'errors.auth.popupClosed',
    'auth/account-exists-with-different-credential': 'errors.auth.accountExists',

    // HTTP Status Codes - API Errors
    400: 'errors.api.badRequest',
    401: 'errors.api.unauthorized',
    403: 'errors.api.forbidden',
    404: 'errors.api.notFound',
    409: 'errors.api.conflict',
    422: 'errors.api.validationError',
    429: 'errors.api.rateLimited',
    500: 'errors.api.serverError',
    502: 'errors.api.badGateway',
    503: 'errors.api.serviceUnavailable',
    504: 'errors.api.gatewayTimeout',

    // Generic Errors
    'NETWORK_ERROR': 'errors.network.connectionFailed',
    'TIMEOUT': 'errors.network.timeout',
    'UNKNOWN': 'errors.api.unknown',
  };

  return errorMap[errorCode] || 'errors.api.unknown';
}

/**
 * Purpose: Extract error code from error object based on error type.
 * Params:
 *   - error: any — Error object from API response or Firebase
 * Returns:
 *   - string | number — Extracted error code
 * Throws:
 *   - N/A
 */
export function extractErrorCode(error: any): string | number {
  if (!error) return 'UNKNOWN';

  // Firebase Auth Error
  if (error.code) {
    return error.code;
  }

  // API Response Error
  if (error.status || error.statusCode) {
    return error.status || error.statusCode;
  }

  // Response Object with error property
  if (typeof error === 'object' && error.error?.code) {
    return error.error.code;
  }

  return 'UNKNOWN';
}

/**
 * Purpose: Handle API error and convert to translated message.
 * Params:
 *   - error: any — Error object from API or Firebase
 *   - t: (key: string) => string — Translation function from useLang hook
 * Returns:
 *   - string — Translated error message
 * Throws:
 *   - N/A
 */
export function handleApiError(
  error: any,
  t: (key: string, defaultValue?: string) => string
): string {
  try {
    const errorCode = extractErrorCode(error);
    const translationKey = getErrorTranslationKey(errorCode);
    return t(translationKey);
  } catch {
    return t('errors.api.unknown');
  }
}

/**
 * Purpose: Get error details with translation key for API responses.
 * Params:
 *   - error: any — Error object from API
 * Returns:
 *   - { key: string; code: string | number } — Translation key and error code
 * Throws:
 *   - N/A
 */
export function getErrorDetails(error: any): {
  key: string;
  code: string | number;
  message?: string;
} {
  const code = extractErrorCode(error);
  const key = getErrorTranslationKey(code);

  return {
    key,
    code,
    message: error?.message || error?.error?.message,
  };
}

/**
 * Purpose: Validate if error is user-friendly and should be shown in UI.
 * Params:
 *   - errorCode: string | number — Error code to validate
 * Returns:
 *   - boolean — True if error should be shown to user
 * Throws:
 *   - N/A
 */
export function isUserFriendlyError(errorCode: string | number): boolean {
  const userFriendlyErrors = [
    'auth/invalid-email',
    'auth/user-not-found',
    'auth/wrong-password',
    'auth/email-already-in-use',
    'auth/weak-password',
    400,
    401,
    403,
    404,
    409,
    422,
  ];

  return userFriendlyErrors.includes(errorCode);
}

/**
 * Purpose: Log error for debugging while showing user-friendly message.
 * Params:
 *   - error: any — Full error object
 *   - context: string — Where error occurred (for logging)
 * Returns:
 *   - { key: string; shouldShow: boolean } — What to show to user
 * Throws:
 *   - N/A
 */
export function processErrorForUI(
  error: any,
  context: string
): {
  key: string;
  shouldShow: boolean;
} {
  try {
    console.error(`[${context}]`, error);

    const code = extractErrorCode(error);
    const key = getErrorTranslationKey(code);
    const shouldShow = isUserFriendlyError(code);

    return { key, shouldShow };
  } catch {
    return {
      key: 'errors.api.unknown',
      shouldShow: true,
    };
  }
}
