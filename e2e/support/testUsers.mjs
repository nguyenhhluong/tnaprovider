function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for authenticated E2E tests. Set it in your environment or .env file.`);
  }
  return value;
}

export const testUsers = {
  owner: {
    email: requiredEnv("E2E_OWNER_EMAIL"),
    password: requiredEnv("E2E_OWNER_PASSWORD"),
  },
  admin: {
    email: requiredEnv("E2E_ADMIN_EMAIL"),
    password: requiredEnv("E2E_ADMIN_PASSWORD"),
  },
  manager: {
    email: requiredEnv("E2E_MANAGER_EMAIL"),
    password: requiredEnv("E2E_MANAGER_PASSWORD"),
  },
  worker: {
    email: requiredEnv("E2E_WORKER_EMAIL"),
    password: requiredEnv("E2E_WORKER_PASSWORD"),
  },
  client: {
    email: requiredEnv("E2E_CLIENT_EMAIL"),
    password: requiredEnv("E2E_CLIENT_PASSWORD"),
  },
};
