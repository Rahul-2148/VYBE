/**
 * accountManager.js — Client-side multi-account registry
 *
 * Stores lightweight account metadata in localStorage.
 * No tokens are stored — only userId, userName, name, profileImageUrl.
 * The server manages sessions/cookies; this registry just tracks
 * which accounts have been linked on this device.
 */

const STORAGE_KEY = "vybe_linked_accounts";
const ACTIVE_KEY = "vybe_active_account";
const MAX_ACCOUNTS = 5;

/**
 * Get all linked accounts from localStorage
 * @returns {Array<{ userId: string, userName: string, name: string, profileImageUrl: string }>}
 */
export const getLinkedAccounts = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn("accountManager: getLinkedAccounts failed", e);
    return [];
  }
};

/**
 * Add or update an account in the registry.
 * If the account already exists (by userId), it updates the metadata.
 * Enforces MAX_ACCOUNTS limit.
 * @param {object} user — user object with _id, userName, name, profileImage
 * @returns {boolean} true if added/updated, false if limit reached
 */
export const addLinkedAccount = (user) => {
  if (!user) return false;

  const userId = user._id || user.userId;
  const userName = user.userName || "";
  const name = user.name || "";
  const profileImageUrl = user.profileImage?.url || user.profileImageUrl || "";

  if (!userId) return false;

  const accounts = getLinkedAccounts();

  // Check if already exists — update metadata
  const existingIndex = accounts.findIndex((a) => a.userId === userId);
  if (existingIndex !== -1) {
    accounts[existingIndex] = { userId, userName, name, profileImageUrl };
  } else {
    // Enforce limit
    if (accounts.length >= MAX_ACCOUNTS) return false;
    accounts.push({ userId, userName, name, profileImageUrl });
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.warn("accountManager: addLinkedAccount failed to write storage", e);
  }

  return true;
};

/**
 * Remove an account from the registry
 * @param {string} userId
 */
export const removeLinkedAccount = (userId) => {
  if (!userId) return;
  const accounts = getLinkedAccounts().filter((a) => a.userId !== userId);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.warn("accountManager: removeLinkedAccount failed to write storage", e);
  }

  // If the removed account was active, clear active marker
  if (getActiveAccountId() === userId) {
    try {
      localStorage.removeItem(ACTIVE_KEY);
    } catch (e) {
      console.warn("accountManager: failed to remove active account key", e);
    }
  }
};

/**
 * Get the currently active account userId
 * @returns {string|null}
 */
export const getActiveAccountId = () => {
  try {
    return localStorage.getItem(ACTIVE_KEY) || null;
  } catch (e) {
    console.warn("accountManager: getActiveAccountId failed", e);
    return null;
  }
};

/**
 * Set the currently active account userId
 * @param {string} userId
 */
export const setActiveAccountId = (userId) => {
  if (!userId) return;
  try {
    localStorage.setItem(ACTIVE_KEY, userId);
  } catch (e) {
    console.warn("accountManager: setActiveAccountId failed", e);
  }
};

/**
 * Clear all linked accounts and active marker (full logout)
 */
export const clearAllAccounts = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ACTIVE_KEY);
  } catch (e) {
    console.warn("accountManager: clearAllAccounts failed", e);
  }
};

/**
 * Get how many accounts are linked
 * @returns {number}
 */
export const getLinkedAccountCount = () => {
  return getLinkedAccounts().length;
};

/**
 * Check if a specific userId is in the linked accounts
 * @param {string} userId
 * @returns {boolean}
 */
export const isAccountLinked = (userId) => {
  return getLinkedAccounts().some((a) => a.userId === userId);
};

/**
 * Get the next available account to switch to after removing one
 * @param {string} excludeUserId — the account being removed
 * @returns {object|null} account entry or null
 */
export const getNextAccount = (excludeUserId) => {
  const accounts = getLinkedAccounts().filter((a) => a.userId !== excludeUserId);
  return accounts.length > 0 ? accounts[0] : null;
};
