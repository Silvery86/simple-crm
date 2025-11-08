/**
 * Purpose: Helper functions to work with encrypted store credentials.
 */

import { decrypt } from '@/lib/utils/encryption';

/**
 * Purpose: Get decrypted WooCommerce credentials for API calls.
 * Params:
 *   - store: Store object from database
 * Returns:
 *   - { consumerKey: string; consumerSecret: string } | null
 */
export function getWooCommerceCredentials(store: {
  platform: string;
  consumerKey?: string | null;
  consumerSecret?: string | null;
}): { consumerKey: string; consumerSecret: string } | null {
  if (store.platform !== 'WOO') {
    return null;
  }

  if (!store.consumerKey || !store.consumerSecret) {
    return null;
  }

  try {
    return {
      consumerKey: store.consumerKey,
      consumerSecret: decrypt(store.consumerSecret),
    };
  } catch (error) {
    console.error('Failed to decrypt WooCommerce credentials:', error);
    return null;
  }
}

/**
 * Purpose: Validate WooCommerce credentials by making a test API call.
 * Params:
 *   - domain: string — Store domain
 *   - consumerKey: string — WooCommerce consumer key
 *   - consumerSecret: string — WooCommerce consumer secret (plain text)
 * Returns:
 *   - Promise<{ success: boolean; message?: string }> — Validation result with error message
 */
export async function validateWooCommerceCredentials(
  domain: string,
  consumerKey: string,
  consumerSecret: string
): Promise<{ success: boolean; message?: string }> {
  try {
    // Test API call to WooCommerce /wp-json/wc/v3/system_status
    const url = `https://${domain}/wp-json/wc/v3/system_status`;
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    if (response.ok) {
      return { success: true };
    }

    // Handle specific error codes
    if (response.status === 401) {
      return { 
        success: false, 
        message: 'Invalid Consumer Key or Consumer Secret (401 Unauthorized)' 
      };
    }

    if (response.status === 404) {
      return { 
        success: false, 
        message: 'WooCommerce API not found on this domain (404 Not Found)' 
      };
    }

    const errorText = await response.text().catch(() => 'Unknown error');
    return { 
      success: false, 
      message: `Connection error (${response.status}): ${errorText.substring(0, 100)}` 
    };
  } catch (error: any) {
    console.error('WooCommerce credentials validation failed:', error);
    
    if (error.code === 'ENOTFOUND') {
      return { 
        success: false, 
        message: 'Domain not found. Please check the domain name.' 
      };
    }

    if (error.code === 'ECONNREFUSED') {
      return { 
        success: false, 
        message: 'Connection refused. Please check domain and firewall settings.' 
      };
    }

    return { 
      success: false, 
      message: error.message || 'Unknown error while connecting to WooCommerce API' 
    };
  }
}
