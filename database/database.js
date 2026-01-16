// Database wrapper with optional NO_DB mode and graceful failure

const { Client } = require('pg');

const connectionString =
    process.env.DATABASE_URL ||
    'postgresql://postgres:password@localhost:5432/agar';

const dbDisabled = /^(1|true|yes)$/i.test(
    String(process.env.NO_DB || process.env.DISABLE_DB || '')
);

const ssl = process.env.DATABASE_URL?.includes('heroku')
    ? { rejectUnauthorized: false }
    : false;

const pgClient = new Client({ connectionString, ssl });

let isConnected = false;
let connectAttempted = false;
let lastConnectError = null;

async function connectIfNeeded() {
    if (dbDisabled) {
        return false;
    }
    if (isConnected) return true;
    if (connectAttempted) return false;

    connectAttempted = true;
    try {
        await pgClient.connect();
        isConnected = true;
        return true;
    } catch (err) {
        lastConnectError = err;
        console.warn('[db] Postgres connection failed:', err?.message || err);
        console.warn("[db] To run without DB set NO_DB=1 or provide a valid DATABASE_URL.");
        return false;
    }
}

function createDbUnavailableError() {
    const err = new Error('Database unavailable');
    err.code = 'DB_UNAVAILABLE';
    err.cause = lastConnectError;
    return err;
}

function query(...args) {
    const maybeCallback = args.length > 0 ? args[args.length - 1] : undefined;
    const hasCallback = typeof maybeCallback === 'function';

    return connectIfNeeded().then((ok) => {
        if (!ok) {
            const err = createDbUnavailableError();
            if (hasCallback) {
                maybeCallback(err);
                return;
            }
            throw err;
        }
        return pgClient.query(...args);
    });
}

module.exports = {
    query,
    connectIfNeeded,
    isConnected: () => isConnected,
};