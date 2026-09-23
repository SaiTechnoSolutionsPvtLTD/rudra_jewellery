import api from '../services/api';

export const DEFAULT_COMPANY_INFO = {
  company_name: 'RUDRA JEWELLERS',
  tagline: 'Exclusive Fine Gold, Diamond & Gemstone Jewellery',
  address_line1: '124, N.S.C. Bose Road',
  address_line2: 'Sowcarpet',
  city: 'Chennai',
  state: 'Tamil Nadu',
  pincode: '600079',
  state_code: '33',
  phone: '+91 98400 12345',
  alternate_phone: '044-25380000',
  email: 'info@rudrajewellers.com',
  website: 'www.rudrajewellers.com',
  gstin: '33AAACR1234F1Z0',
  pan_no: 'AAACR1234F',
  reg_no: 'CHN/2026/JEW/9912',
  hallmark_license: 'HM-339018274',
  terms_and_conditions: "1. Goods once sold will not be taken back or exchanged after 7 days.\n2. Weight and purity certified as per BIS Hallmark standards.\n3. Subject to Chennai jurisdiction only.",
  bank_name: 'HDFC Bank',
  account_number: '50200018899221',
  ifsc_code: 'HDFC0000124',
  branch: 'Sowcarpet, Chennai',
  logo_url: '/logo.png',
  is_default: true,
  is_active: true
};

/**
 * Synchronous cached lookup from LocalStorage or default fallback.
 */
export const getStoredCompanyInfo = () => {
  try {
    const raw = localStorage.getItem('rudhra_company_info');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.company_name) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse cached company info:', e);
  }
  return DEFAULT_COMPANY_INFO;
};

/**
 * Async fetcher from backend API with automatic LocalStorage caching.
 */
export const fetchCompanyInfo = async () => {
  try {
    const response = await api.get('/company-info/default');
    if (response?.data && response.data.company_name) {
      localStorage.setItem('rudhra_company_info', JSON.stringify(response.data));
      window.dispatchEvent(new CustomEvent('rudhra_company_info_updated', { detail: response.data }));
      return response.data;
    }
  } catch (err) {
    console.warn('Backend company info fetch failed, using fallback:', err);
  }
  return getStoredCompanyInfo();
};
