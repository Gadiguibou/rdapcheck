export type BootstrapServiceRegistry = {
    version: string; // e.g. "1.0"
    publication: string; // e.g. "YYYY-MM-DDTHH:MM:SSZ"
    description: string; // e.g. "Some text"
    services: BootstrapService[];
};

export type BootstrapService = [Entry[], ServiceURL[]];

export type Entry = string;

export type ServiceURL = string;

export function getDNSBootstrapFile(): Promise<BootstrapServiceRegistry> {
    const DNS_BOOTSTRAP_FILE_URL = "https://data.iana.org/rdap/dns.json";
    return fetch(DNS_BOOTSTRAP_FILE_URL).then((response) => response.json());
}

export function getBootstrapServiceForTLD(
    tld: string,
    bootstrapFile: BootstrapServiceRegistry
): BootstrapService | undefined {
    return bootstrapFile.services.find((service) => service[0].includes(tld));
}

export function getServiceURLs(bootstrapService: BootstrapService): ServiceURL[] {
    return bootstrapService[1];
}

export function queryServiceForDomain(serviceURL: ServiceURL, domain: string): Promise<Response> {
    return fetch(`${serviceURL}domain/${domain}`);
}

export function checkDomainAvailability(serviceURL: ServiceURL, domain: string): Promise<boolean> {
    return queryServiceForDomain(serviceURL, domain).then((response) => {
        if (response.ok) {
            return false;
        } else if (response.status === 404) {
            return true;
        } else {
            throw new Error(`Unexpected status code: ${response.status}`);
        }
    });
}

export function queryServiceForDomainOrRetry(
    serviceURL: ServiceURL,
    domain: string,
    waitMs = 100
): Promise<Response> {
    return resolveOrRetry(() => queryServiceForDomain(serviceURL, domain), waitMs);
}

export function checkDomainAvailabilityOrRetry(
    serviceURL: ServiceURL,
    domain: string,
    waitMs = 100
): Promise<boolean> {
    return resolveOrRetry(() => checkDomainAvailability(serviceURL, domain), waitMs);
}

export function queryServiceForDomainsAsync(
    serviceURL: ServiceURL,
    domains: string[]
): Promise<Response[]> {
    return Promise.all(domains.map((domain) => queryServiceForDomainOrRetry(serviceURL, domain)));
}

export function checkDomainsAvailabilityAsync(
    serviceURL: ServiceURL,
    domains: string[]
): Promise<boolean[]> {
    return Promise.all(domains.map((domain) => checkDomainAvailabilityOrRetry(serviceURL, domain)));
}

export function queryServiceForDomainsSequential(
    serviceURL: ServiceURL,
    domains: string[]
): Promise<Response[]> {
    return sequentialize(domains.map((domain) => () => queryServiceForDomain(serviceURL, domain)));
}

export function checkDomainsAvailabilitySequential(
    serviceURL: ServiceURL,
    domains: string[]
): Promise<boolean[]> {
    return sequentialize(
        domains.map((domain) => () => checkDomainAvailability(serviceURL, domain))
    );
}

function resolveOrRetry<T>(f: () => Promise<T>, waitMs: number): Promise<T> {
    return f().catch(() => sleep(waitMs).then(() => resolveOrRetry(f, waitMs)));
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function sequentialize<T>(fs: (() => Promise<T>)[]): Promise<T[]> {
    const results: T[] = [];
    return fs
        .reduce(
            (p, f) =>
                p.then(f).then((response) => {
                    results.push(response);
                }),
            Promise.resolve()
        )
        .then(() => results);
}
