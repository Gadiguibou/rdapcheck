import * as mod from "./mod.ts";

type ProgramOptions = {
    quiet: boolean;
    chunkSize: number;
    progress: boolean;
    domains: string[];
};

const options: ProgramOptions = {
    quiet: false,
    // The author chose 10 as the default chunk size mostly arbitrarily.
    //
    // The program was tested for performance on a ~700 queries long test set for the .net TLD
    // with chunks of the following sizes:
    //
    // - 0 (making all queries asynchronously)
    // - 1 (querying sequentially)
    // - 5 (making 5 asynchronous queries at a time before reporting the results)
    // - 10
    // - 50
    // - 100
    // - 500
    //
    // Performance differences were within the margin of error for all chunk sizes with the
    // exception of sequential queries (1 query per chunk) which was slower than the average by a
    // noticeable margin.
    //
    // The author chose 10 as the default chunk size as this didn't affect performance noticeably
    // when compared to all asynchronous queries and allowed for a better granularity of the
    // progress report when making larger queries.
    chunkSize: 10,
    progress: false,
    domains: Deno.args,
};

if (Deno.args.length < 1 || Deno.args.includes("--help") || Deno.args.includes("-h")) {
    console.error("Usage: rdapcheck [OPTIONS] DOMAINS...");
    Deno.exit(1);
}

for (let i = 0; i < Deno.args.length; i++) {
    const arg = Deno.args[i];

    if (arg === "-q" || arg === "--quiet") {
        options.quiet = true;
    } else if (arg === "-p" || arg === "--progress") {
        options.progress = true;
    } else if (arg === "-c" || arg === "--chunk-size") {
        i++;
        const parsedChunkSize = parseInt(Deno.args[i]);
        if (i >= Deno.args.length || isNaN(parsedChunkSize) || parsedChunkSize < 0) {
            console.error("Could not parse chunk size");
            Deno.exit(1);
        }
        options.chunkSize = parsedChunkSize;
    } else {
        options.domains = Deno.args.slice(i);
        break;
    }
}

const domains = options.domains.flatMap(mod.findDomainNamesMatchingPattern);

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

const serviceURLs = bootstrapServices.map(
    (bootstrapService) => mod.getServiceURLs(bootstrapService)[0]
);

let processedEntries = 0;

for (const [tldIndex, tld] of uniqueTlds.entries()) {
    const serviceURL = serviceURLs[tldIndex];
    const domainsWithThisTld = domainTldPairs
        .filter((domainTldPair) => domainTldPair[1] === tld)
        .map((domainTldPair) => domainTldPair[0]);

    const domainsWithThisTldChunked =
        options.chunkSize != 0
            ? mod.splitIntoChunks(domainsWithThisTld, options.chunkSize)
            : [domainsWithThisTld];

    for (const [chunkIndex, chunk] of domainsWithThisTldChunked.entries()) {
        const availabilities = await mod.checkDomainsAvailabilityAsync(serviceURL, chunk);

        if (options.progress) {
            // If this isn't the first line, clear the previous progress indicator by moving the cursor
            // up one line and clearing the entire line
            if (tldIndex !== 0 || chunkIndex !== 0) {
                Deno.stdout.writeSync(new TextEncoder().encode("\u001b[1A\u001b[2K"));
            }
        }
        for (const [index, availability] of availabilities.entries()) {
            if (options.quiet) {
                if (availability) {
                    console.log(chunk[index]);
                }
            } else {
                if (availability) {
                    console.log(`${chunk[index]} is available`);
                } else {
                    console.log(`${chunk[index]} is not available`);
                }
            }
        }
        if (options.progress) {
            processedEntries += chunk.length;
            // Display current progress
            console.log(`Processed ${processedEntries} out of ${domains.length} entries`);
        }
    }
}
if (options.progress && domains.length > 0) {
    // Clear the progress bar by moving the cursor up one line and clearing the entire line
    Deno.stdout.writeSync(new TextEncoder().encode("\u001b[1A\u001b[2k"));
}
