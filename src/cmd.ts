import * as mod from "./mod.ts";

if (Deno.args.length < 1 || Deno.args.includes("--help") || Deno.args.includes("-h")) {
    console.error("Usage: dmncheck DOMAINS...");
    Deno.exit(1);
}

const domains = Deno.args;
const domainTldPairs: [string, string][] = domains.map((domain) => {
    const parts = domain.split(".");
    if (parts.length < 2 || parts.length >= 3) {
        console.error(`Could not find the tld for domain '${domain}'`);
        console.error('All domain names must be fully qualified. For example: "example.com"');
        Deno.exit(2);
    }
    const tld = parts[1];
    return [domain, tld];
});

const bootstrapFile = await mod.getDNSBootstrapFile();

const tlds = domainTldPairs.map((domain_tld_pair) => domain_tld_pair[1]) as string[];
const uniqueTlds = [...new Set(tlds)];
const bootstrapServices = uniqueTlds.map((tld) => {
    const service = mod.getBootstrapServiceForTLD(tld, bootstrapFile);
    if (service === undefined) {
        console.error(`Could not find a bootstrap service for tld '${tld}'`);
        Deno.exit(3);
    }
    return service;
});

const serviceURLs = bootstrapServices.map((bootstrapService) =>
    mod.getServiceURLs(bootstrapService)[0]
);

for (const [index, tld] of uniqueTlds.entries()) {
    const serviceURL = serviceURLs[index];
    const domainsWithThisTld = domainTldPairs
        .filter((domainTldPair) => domainTldPair[1] === tld)
        .map((domainTldPair) => domainTldPair[0]);

    const availabilities = await mod.checkDomainsAvailabilityAsync(serviceURL, domainsWithThisTld);
    for (const [index, availability] of availabilities.entries()) {
        if (availability) {
            console.log(`${domainsWithThisTld[index]} is available`);
        } else {
            console.log(`${domainsWithThisTld[index]} is not available`);
        }
    }
}
