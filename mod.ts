export type BootstrapServiceRegistry = {
    "version": string, // e.g. "1.0"
    "publication": string, // e.g. "YYYY-MM-DDTHH:MM:SSZ"
    "description": string, // e.g. "Some text"
    "services": BootstrapService[],
}

export type BootstrapService = [Entry[], ServiceURL[]]

export type Entry = string;

export type ServiceURL = string;

export async function getDNSBootstrapFile(): Promise<BootstrapServiceRegistry> {
    const DNS_BOOTSTRAP_FILE_URL = "https://data.iana.org/rdap/dns.json";
    return await fetch(DNS_BOOTSTRAP_FILE_URL).then(response => response.json());
}

export function getBootstrapServiceForTLD(tld: string, bootstrapFile: BootstrapServiceRegistry): BootstrapService | undefined {
    return bootstrapFile.services.find(service => service[0].includes(tld));
}

export function getServiceURLs(bootstrapService: BootstrapService): ServiceURL[] {
    return bootstrapService[1];
}
