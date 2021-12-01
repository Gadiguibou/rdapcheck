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
    bootstrapFile: BootstrapServiceRegistry,
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
            throw response;
        }
    });
}

const ALL_POSSIBLE_CHARACTERS = "abcdefghijklmnopqrstuvwxyz0123456789-".split("");
const POSSIBLE_ALPHABET_CHARACTERS = "abcdefghijklmnopqrstuvwxyz".split("");
const POSSIBLE_NUMBER_CHARACTERS = "0123456789".split("");

export function findDomainNamesMatchingPattern(pattern: string): string[] {
    // The author chose to filter out domains which are fundamentally invalid from the results
    // to prevent reporting false positives to the user
    return _findDomainNamesMatchingPattern(pattern).filter(
        (domainName) =>
            // Domain names cannot start or end with a hyphen ("-")
            domainName.at(0) !== "-" &&
            domainName.at(-1) !== "-" &&
            // Domain names cannot contain consecutive hyphens ("-")
            !domainName.includes("--") &&
            // Domain names must only consist of the 26 letters of the ISO basic Latin alphabet
            // in a case insensitive manner, numbers and hyphens ("-")
            //
            // Since domain names are separated from their top-level domain with a period character
            // ("."), we ignore those while checking for the validity of the domain name.
            domainName
                .split("")
                .every(
                    (char) => char === "." || ALL_POSSIBLE_CHARACTERS.includes(char.toLowerCase()),
                ),
    );
}

function _findDomainNamesMatchingPattern(pattern: string): string[] {
    const indexOfFirstAsterisk = pattern.indexOf("*");
    const indexOfFirstQuestionMark = pattern.indexOf("?");
    const indexOfFirstNumberSign = pattern.indexOf("#");

    const wildcardIndexes = [
        indexOfFirstAsterisk,
        indexOfFirstQuestionMark,
        indexOfFirstNumberSign,
    ];

    if (Math.max(...wildcardIndexes) === -1) {
        // No wildcard was found
        return [pattern];
    }

    const firstWildcardIndex = Math.min(...wildcardIndexes.filter((n) => n != -1));
    const replacementCharacters = firstWildcardIndex === indexOfFirstQuestionMark
        ? POSSIBLE_ALPHABET_CHARACTERS
        : firstWildcardIndex === indexOfFirstNumberSign
        ? POSSIBLE_NUMBER_CHARACTERS
        : ALL_POSSIBLE_CHARACTERS;

    // Replace the first wildcard with all possible characters that could take its place and recurse
    return replacementCharacters.flatMap((character) =>
        _findDomainNamesMatchingPattern(
            replaceIndexInString(pattern, character, firstWildcardIndex),
        )
    );
}

export function queryServiceForDomainOrRetry(
    serviceURL: ServiceURL,
    domain: string,
    // The choice of 100 ms as a default for timeouts is almost arbitrary.
    //
    // The program was tested for performance on a ~700 queries long test set for the .net TLD
    // with no chunks or chunks of size 50 and the following timeout settings:
    //
    // - 1 ms
    // - 10 ms
    // - 50 ms
    // - 100 ms
    // - 500 ms
    // - 1000 ms
    //
    // Performance differences were within the margin of error for all of the timeout settings with
    // the exception of the 1000 ms timeout tests which were slower by around 10 %.
    //
    // Since no conclusion could be taken from a performance point of view on the basis of these
    // tests, the author chose 100 ms as a good middle ground between minimizing the performance
    // impact of a failed request on a small query set and limiting unnecessary requests to the
    // RDAP services.
    waitMs = 100,
): Promise<Response> {
    return resolveOrRetry(() => queryServiceForDomain(serviceURL, domain), waitMs);
}

export function checkDomainAvailabilityOrRetry(
    serviceURL: ServiceURL,
    domain: string,
    waitMs = 100,
): Promise<boolean> {
    return resolveOrRetry(() => checkDomainAvailability(serviceURL, domain), waitMs);
}

export function queryServiceForDomainsAsync(
    serviceURL: ServiceURL,
    domains: string[],
): Promise<Response[]> {
    return Promise.all(domains.map((domain) => queryServiceForDomainOrRetry(serviceURL, domain)));
}

export function checkDomainsAvailabilityAsync(
    serviceURL: ServiceURL,
    domains: string[],
): Promise<boolean[]> {
    return Promise.all(domains.map((domain) => checkDomainAvailabilityOrRetry(serviceURL, domain)));
}

export function queryServiceForDomainsSequential(
    serviceURL: ServiceURL,
    domains: string[],
): Promise<Response[]> {
    return sequentialize(domains.map((domain) => () => queryServiceForDomain(serviceURL, domain)));
}

export function checkDomainsAvailabilitySequential(
    serviceURL: ServiceURL,
    domains: string[],
): Promise<boolean[]> {
    return sequentialize(
        domains.map((domain) => () => checkDomainAvailability(serviceURL, domain)),
    );
}

export function splitIntoChunks<T>(arr: T[], maxChunkSize: number): T[][] {
    const result = [];
    const numberOfChunks = Math.ceil(arr.length / maxChunkSize);
    for (let i = 0; i < numberOfChunks; i++) {
        result.push(arr.slice(maxChunkSize * i, maxChunkSize * (i + 1)));
    }
    return result;
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
            Promise.resolve(),
        )
        .then(() => results);
}

function replaceIndexInString(original: string, replacement: string, index: number): string {
    return original.substring(0, index) + replacement + original.substring(index + 1);
}
