import * as Sentry from "@sentry/react";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

const isValidDSN = SENTRY_DSN &&
    SENTRY_DSN.startsWith('https://') &&
    !SENTRY_DSN.includes('your_sentry_dsn');

export const initMonitoring = () => {
    if (isValidDSN) {
        try {
            Sentry.init({
                dsn: SENTRY_DSN,
                integrations: [
                    Sentry.browserTracingIntegration(),
                    Sentry.replayIntegration(),
                ],
                tracesSampleRate: 1.0,
                tracePropagationTargets: ["localhost", /^https:\/\/mzansivideos\.app/],
                replaysSessionSampleRate: 0.1,
                replaysOnErrorSampleRate: 1.0,
            });
            if (import.meta.env.DEV) console.log("Sentry initialized");
        } catch (e) {
            if (import.meta.env.DEV) console.warn("Sentry initialization failed:", e);
        }
    } else {
        if (import.meta.env.DEV) console.warn("Sentry DSN not valid. Monitoring disabled.");
    }
};

export const captureError = (error: Error, context?: Record<string, unknown>) => {
    if (isValidDSN) {
        Sentry.captureException(error, { extra: context });
    } else {
        console.error('Error:', error, context);
    }
};

export const logMessage = (message: string, level: Sentry.SeverityLevel = "info") => {
    if (isValidDSN) {
        Sentry.captureMessage(message, level);
    }
};
