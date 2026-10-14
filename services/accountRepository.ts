import { readJson, writeJson } from './storage';

export interface StoredAccount {
  email: string;
  password: string;
  name: string;
  phone?: string;
  createdAt: string;
}

const ACCOUNTS_KEY = '@nasjak_accounts';

export const DEFAULT_SUPER_ADMIN_ACCOUNT: StoredAccount = {
  email: 'nasjak@gmail.com',
  password: 'Admin123',
  name: 'Super Admin NASJAK',
  createdAt: new Date().toISOString(),
};

export const DEFAULT_SAHABAT_ACCOUNT: StoredAccount = {
  email: 'david@nasjak.id',
  password: 'qwerty123',
  name: 'David Sahabat NASUHA',
  createdAt: new Date().toISOString(),
};

export const DEFAULT_ADMIN_ACCOUNTS: StoredAccount[] = [
  {
    email: 'wimba@nasjak.id',
    password: 'Nasjak2026',
    name: 'Wimba Admin NASUHA',
    createdAt: new Date().toISOString(),
  },
  {
    email: 'ashadi@nasjak.id',
    password: 'Nasjak2026',
    name: 'Ashadi Admin NASUHA',
    createdAt: new Date().toISOString(),
  },
];

export async function loadAccounts(): Promise<StoredAccount[]> {
  const accounts = await readJson<StoredAccount[]>(ACCOUNTS_KEY);
  if (!Array.isArray(accounts)) return [];

  return accounts.filter(
    (account): account is StoredAccount =>
      Boolean(account && typeof account.email === 'string' && typeof account.password === 'string'),
  );
}

export async function saveAccounts(accounts: StoredAccount[]): Promise<void> {
  await writeJson(ACCOUNTS_KEY, accounts);
}

export async function ensureDefaultSuperAdmin(): Promise<void> {
  const accounts = await loadAccounts();
  const defaults = [DEFAULT_SUPER_ADMIN_ACCOUNT, DEFAULT_SAHABAT_ACCOUNT, ...DEFAULT_ADMIN_ACCOUNTS];
  let changed = false;
  const nextAccounts = [...accounts];

  defaults.forEach((defaultAccount) => {
    const existingIndex = nextAccounts.findIndex((account) => account.email.toLowerCase() === defaultAccount.email.toLowerCase());
    if (existingIndex < 0) {
      nextAccounts.push(defaultAccount);
      changed = true;
      return;
    }

    const existingAccount = nextAccounts[existingIndex];
    if (DEFAULT_ADMIN_ACCOUNTS.some((account) => account.email.toLowerCase() === defaultAccount.email.toLowerCase()) && existingAccount.password !== defaultAccount.password) {
      nextAccounts[existingIndex] = { ...existingAccount, password: defaultAccount.password, name: defaultAccount.name };
      changed = true;
    }
  });

  if (changed) {
    await saveAccounts(nextAccounts);
  }
}
