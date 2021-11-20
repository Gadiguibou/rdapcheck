export type BootstrapServiceRegistry = {
    version: string; // e.g. "1.0"
    publication: string; // e.g. "YYYY-MM-DDTHH:MM:SSZ"
    description: string; // e.g. "Some text"
    services: BootstrapService[];
};

export type BootstrapService = [Entry[], ServiceURL[]];

export type Entry = string;

export type ServiceURL = string;

export async function getDNSBootstrapFile(): Promise<BootstrapServiceRegistry> {
    const DNS_BOOTSTRAP_FILE_URL = "https://data.iana.org/rdap/dns.json";
    return await fetch(DNS_BOOTSTRAP_FILE_URL).then((response) => response.json());
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

export async function queryServiceForDomain(
    serviceURL: ServiceURL,
    domain: string
): Promise<Response> {
    return await fetch(`${serviceURL}domain/${domain}`);
}

export async function checkDomainAvailability(
    serviceURL: ServiceURL,
    domain: string
): Promise<boolean> {
    return await queryServiceForDomain(serviceURL, domain).then((response) => {
        if (response.ok) {
            return false;
        } else if (response.status === 404) {
            return true;
        } else {
            throw new Error(`Unexpected status code: ${response.status}`);
        }
    });
}

export async function queryServiceForDomainOrRetry(
    serviceURL: ServiceURL,
    domain: string,
    waitMs = 100
): Promise<Response> {
    return await resolveOrRetry(() => queryServiceForDomain(serviceURL, domain), waitMs);
}

export async function checkDomainAvailabilityOrRetry(
    serviceURL: ServiceURL,
    domain: string,
    waitMs = 100
): Promise<boolean> {
    return await resolveOrRetry(() => checkDomainAvailability(serviceURL, domain), waitMs);
}

export async function queryServiceForDomainsAsync(
    serviceURL: ServiceURL,
    domains: string[]
): Promise<Response[]> {
    return await Promise.all(
        domains.map((domain) => queryServiceForDomainOrRetry(serviceURL, domain))
    );
}

export async function checkDomainsAvailabilityAsync(
    serviceURL: ServiceURL,
    domains: string[]
): Promise<boolean[]> {
    return await Promise.all(
        domains.map((domain) => checkDomainAvailabilityOrRetry(serviceURL, domain))
    );
}

export async function queryServiceForDomainsSequential(
    serviceURL: ServiceURL,
    domains: string[]
): Promise<Response[]> {
    const results: Response[] = [];
    return await sequentialize(
        domains.map(
            (domain) => () =>
                queryServiceForDomain(serviceURL, domain).then((response) => {
                    results.push(response);
                })
        )
    ).then(() => results);
}

export async function checkDomainsAvailabilitySequential(
    serviceURL: ServiceURL,
    domains: string[]
): Promise<boolean[]> {
    const results: boolean[] = [];
    return await sequentialize(
        domains.map(
            (domain) => () =>
                checkDomainAvailability(serviceURL, domain).then((response) => {
                    results.push(response);
                })
        )
    ).then(() => results);
}

async function resolveOrRetry<T>(f: () => Promise<T>, waitMs: number): Promise<T> {
    try {
        return await f();
    } catch (_) {
        return await sleep(waitMs).then(() => resolveOrRetry(f, waitMs));
    }
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function sequentialize(fs: (() => Promise<void>)[]): Promise<void> {
    return fs.reduce((p, f) => p.then(f), Promise.resolve());
}
