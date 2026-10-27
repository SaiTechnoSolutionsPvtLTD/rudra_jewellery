import axios from 'axios';

/**
 * Sanitizes any raw server / database / framework exception message
 * into a clean, professional, user-friendly error message with appropriate status code.
 */
export function sanitizeErrorMessage(error, fallback = 'An unexpected error occurred. Please try again.') {
  if (!error) return fallback;

  // Extract raw string candidate
  let raw =
    (typeof error === 'string' ? error : null) ||
    error?.userMessage ||
    error?.response?.data?.message ||
    (typeof error?.response?.data?.error === 'string' ? error.response.data.error : null) ||
    (typeof error?.response?.data === 'string' ? error.response.data : null) ||
    error?.message ||
    '';

  // Extract first field validation error message if errors dictionary is present
  if (error?.response?.data?.errors && typeof error.response.data.errors === 'object') {
    const errorValues = Object.values(error.response.data.errors).flat().filter(Boolean);
    if (errorValues.length > 0) {
      raw = errorValues[0];
    }
  }

  const status = error?.response?.status;
  const reqUrl = error?.config?.url || '';

  // Patterns that indicate internal/technical details, SQL errors, or code exceptions
  const technicalPatterns = [
    /SQLSTATE/i,
    /QueryException/i,
    /PDOException/i,
    /select \* from/i,
    /insert into/i,
    /update `.*` set/i,
    /delete from/i,
    /tablespace is missing/i,
    /storage engine/i,
    /column not found/i,
    /base table or view not found/i,
    /syntax error/i,
    /call to undefined/i,
    /uncaught exception/i,
    /fatal error/i,
    /stack trace/i,
    /Connection: mysql/i,
    /Host: 127\.0\.0\.1/i,
    /Database: /i,
    /Illuminate\\/i,
    /App\\Models/i,
    /vendor\//i,
    /\.php:\d+/i,
  ];

  const hasTechnicalData = technicalPatterns.some((pattern) => pattern.test(raw));

  // Network / Connection errors
  if (
    error?.code === 'ERR_NETWORK' ||
    error?.code === 'ECONNABORTED' ||
    raw.includes('Network Error') ||
    (typeof navigator !== 'undefined' && !navigator.onLine)
  ) {
    return 'Unable to connect to the server. Please try again later.';
  }

  // Database unique constraint mappings
  if (/Duplicate entry.*product_code/i.test(raw) || (raw.toLowerCase().includes('product code') && raw.toLowerCase().includes('already'))) {
    return 'This product code already exists.';
  }
  if (/Duplicate entry/i.test(raw)) {
    return 'A record with this information already exists.';
  }
  if (/foreign key constraint/i.test(raw)) {
    return 'This record cannot be deleted or modified because it is referenced by other records.';
  }

  // Handle standard HTTP status codes
  if (status === 401) {
    const isLoginEndpoint = reqUrl.includes('/login') || (typeof window !== 'undefined' && window.location.pathname === '/login');
    if (isLoginEndpoint || /credential/i.test(raw) || /invalid email/i.test(raw)) {
      return 'Invalid email/username or password.';
    }
    return 'Your session has expired. Please log in again.';
  }

  if (status === 403) {
    return 'You do not have permission to perform this action.';
  }

  if (status === 404) {
    if (raw && !hasTechnicalData && !raw.includes('404') && !raw.toLowerCase().includes('not found')) {
      return raw;
    }
    return 'The requested record could not be found.';
  }

  if (status === 400) {
    if (raw && !hasTechnicalData) return raw;
    return 'Invalid request. Please verify the entered information.';
  }

  if (status === 419) {
    return 'Your session has expired. Please log in again.';
  }

  if (status === 422) {
    if (raw && !hasTechnicalData) {
      if (/email.*valid/i.test(raw) || /valid email/i.test(raw)) {
        return 'Please enter a valid email address.';
      }
      if (/product code.*(already|taken|exists)/i.test(raw) || /product_code.*(already|taken|exists)/i.test(raw)) {
        return 'This product code already exists.';
      }
      if (/weight.*(greater than zero|positive)/i.test(raw) || /valid weight/i.test(raw)) {
        return 'Please enter a valid weight greater than zero.';
      }
      if (/image.*(size|5120|5\s*mb|max)/i.test(raw)) {
        return 'Image size must not exceed the allowed limit of 5 MB.';
      }
      if (/image.*(format|type|mimes|extension)/i.test(raw)) {
        return 'Please upload a supported image format (JPEG, PNG, or WebP).';
      }
      if (/upload.*fail/i.test(raw) || /failed to upload/i.test(raw)) {
        return 'Image upload failed. Please try again.';
      }
      return raw;
    }
    return 'Please check the required fields and verify the entered information.';
  }

  if (status === 429) {
    return 'Too Many Requests (429). Please wait a moment and try again.';
  }

  if (status >= 500 || hasTechnicalData) {
    if (status === 502) {
      return 'Bad gateway. Please try again in a moment.';
    }
    if (status === 503) {
      return 'The service is temporarily unavailable. Please try again later.';
    }
    if (status === 504) {
      return 'Server response timed out. Please try again.';
    }
    if (raw && !hasTechnicalData && !raw.includes('SQLSTATE') && !raw.includes('Exception') && !raw.includes('Unable to connect')) {
      return raw;
    }
    return 'An internal server error occurred. Please try again.';
  }

  if (raw && !hasTechnicalData) {
    return raw;
  }

  return fallback;
}

const rawApi = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

rawApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token && token !== 'undefined' && token !== 'null') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

rawApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // Sanitize any error payload so components never receive raw technical strings
    const cleanMsg = sanitizeErrorMessage(error);
    if (error.response?.data && typeof error.response.data === 'object') {
      error.response.data.message = cleanMsg;
    }
    error.userMessage = cleanMsg;

    if (error.response && error.response.status === 401) {
      const isLoginRequest = error.config?.url?.includes('/login');
      if (!isLoginRequest) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// High-speed In-Memory Master Cache for Instant Dropdowns & Zero Latency
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL
const masterCache = new Map();
const inFlightRequests = new Map();

const MASTER_URL_PATTERNS = [
  '/categories',
  '/subcategories',
  '/styles',
  '/gold-types',
  '/karats',
  '/stamps',
  '/units',
  '/diamond-ranges',
  '/diamond-colors',
  '/diamond-clarities',
  '/component-categories',
  '/suppliers',
  '/karigars',
  '/items',
  '/memberships',
  '/bank-accounts',
  '/company-info',
  '/metal-rates',
  '/product-designs/meta',
  '/operations',
];

const isMasterUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const clean = url.replace(/^\/api/, '').split('?')[0];
  return MASTER_URL_PATTERNS.some((p) => clean === p || clean.startsWith(`${p}/`));
};

const buildCacheKey = (url, params) => {
  if (!params || Object.keys(params).length === 0) return url;
  try {
    const sorted = Object.keys(params).sort().reduce((acc, k) => {
      acc[k] = params[k];
      return acc;
    }, {});
    return `${url}?${JSON.stringify(sorted)}`;
  } catch (e) {
    return url;
  }
};

export const clearApiCache = (pattern) => {
  if (!pattern) {
    masterCache.clear();
    return;
  }
  for (const key of masterCache.keys()) {
    if (key.includes(pattern)) {
      masterCache.delete(key);
    }
  }
};

const invalidateOnMutation = (url) => {
  if (!url || typeof url !== 'string') return;
  const clean = url.replace(/^\/api/, '').split('?')[0].replace(/\/([0-9]+|[a-f0-9-]+)$/, '');
  for (const key of masterCache.keys()) {
    if (key.startsWith(clean) || clean.startsWith(key.split('?')[0])) {
      masterCache.delete(key);
    }
  }
};

const api = new Proxy(rawApi, {
  get(target, prop, receiver) {
    if (prop === 'get') {
      return (url, config = {}) => {
        const shouldCache = !config?.skipCache && isMasterUrl(url);
        if (!shouldCache) {
          return rawApi.get(url, config);
        }

        const cacheKey = buildCacheKey(url, config?.params);
        const cached = masterCache.get(cacheKey);

        // 1. Instant Cache hit (0ms return)
        if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
          // If older than 45 seconds, silently revalidate in background
          if (Date.now() - cached.timestamp > 45000 && !inFlightRequests.has(cacheKey)) {
            const revalidatePromise = rawApi.get(url, config)
              .then((res) => {
                masterCache.set(cacheKey, { response: res, timestamp: Date.now() });
                inFlightRequests.delete(cacheKey);
              })
              .catch(() => inFlightRequests.delete(cacheKey));
            inFlightRequests.set(cacheKey, revalidatePromise);
          }

          return Promise.resolve({
            ...cached.response,
            data: cached.response.data && typeof cached.response.data === 'object'
              ? JSON.parse(JSON.stringify(cached.response.data))
              : cached.response.data,
          });
        }

        // 2. In-flight request deduplication (share existing Promise)
        if (inFlightRequests.has(cacheKey)) {
          return inFlightRequests.get(cacheKey).then((res) => ({
            ...res,
            data: res.data && typeof res.data === 'object'
              ? JSON.parse(JSON.stringify(res.data))
              : res.data,
          }));
        }

        // 3. Dispatch new request
        const promise = rawApi.get(url, config)
          .then((res) => {
            masterCache.set(cacheKey, { response: res, timestamp: Date.now() });
            inFlightRequests.delete(cacheKey);
            return {
              ...res,
              data: res.data && typeof res.data === 'object'
                ? JSON.parse(JSON.stringify(res.data))
                : res.data,
            };
          })
          .catch((err) => {
            inFlightRequests.delete(cacheKey);
            throw err;
          });

        inFlightRequests.set(cacheKey, promise);
        return promise;
      };
    }

    if (prop === 'post' || prop === 'put' || prop === 'patch' || prop === 'delete') {
      return (url, ...args) => {
        invalidateOnMutation(url);
        return target[prop](url, ...args);
      };
    }

    if (prop === 'clearCache') {
      return clearApiCache;
    }

    const val = Reflect.get(target, prop, receiver);
    if (typeof val === 'function') {
      return val.bind(target);
    }
    return val;
  },
});

/**
 * Preload common master lists in background so dropdowns display instantly everywhere
 */
export async function preloadMasters() {
  const token = localStorage.getItem('auth_token');
  if (!token) return;
  if (window.__mastersPreloaded) return;
  window.__mastersPreloaded = true;

  const endpoints = [
    '/categories',
    '/subcategories',
    '/karats',
    '/stamps',
    '/units',
    '/styles',
    '/gold-types',
    '/diamond-clarities',
    '/diamond-colors',
    '/diamond-ranges',
    '/suppliers',
    '/karigars',
    '/items',
    '/component-categories',
    '/metal-rates',
    '/company-info/default',
  ];

  for (const ep of endpoints) {
    api.get(ep).catch(() => {});
    await new Promise((r) => setTimeout(r, 60));
  }
}

export default api;
