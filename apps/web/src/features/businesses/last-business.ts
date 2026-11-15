const LAST_BUSINESS_STORAGE_KEY = 'ascend:last-business-id';

export const getLastBusinessId = () => {
  try {
    return window.localStorage.getItem(LAST_BUSINESS_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const setLastBusinessId = (businessId: string) => {
  try {
    window.localStorage.setItem(LAST_BUSINESS_STORAGE_KEY, businessId);
    return true;
  } catch {
    return false;
  }
};
