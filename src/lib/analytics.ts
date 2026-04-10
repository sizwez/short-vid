import ReactGA from "react-ga4";

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

export const initGA = () => {
    if (GA_MEASUREMENT_ID && GA_MEASUREMENT_ID.startsWith('G-')) {
        try {
            ReactGA.initialize(GA_MEASUREMENT_ID);
            if (import.meta.env.DEV) console.log("GA initialized");
        } catch (e) {
            if (import.meta.env.DEV) console.warn("GA initialization failed:", e);
        }
    } else {
        if (import.meta.env.DEV) console.warn("GA Measurement ID not valid or not found. Analytics disabled.");
    }
};

export const trackPageView = (path: string) => {
    if (GA_MEASUREMENT_ID) {
        ReactGA.send({ hitType: "pageview", page: path });
    }
};

export const trackEvent = (category: string, action: string, label?: string, value?: number) => {
    if (GA_MEASUREMENT_ID) {
        ReactGA.event({
            category,
            action,
            label,
            value,
        });
    }
};

export const trackVideoPlay = (videoId: string, videoTitle: string) => {
    trackEvent("Video", "Play", `${videoTitle} (${videoId})`);
};

export const trackSignup = (method: string) => {
    trackEvent("User", "Signup", method);
};

export const trackPayment = (amount: number) => {
    trackEvent("Monetization", "Payment Success", undefined, amount);
};
