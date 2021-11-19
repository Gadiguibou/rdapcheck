export type BootstrapServiceRegistry = {
    "version": string, // e.g. "1.0"
    "publication": string, // e.g. "YYYY-MM-DDTHH:MM:SSZ"
    "description": string, // e.g. "Some text"
    "services": BootstrapService[],
}

export type BootstrapService = [Entry[], ServiceURL[]]

export type Entry = string;

export type ServiceURL = string;

