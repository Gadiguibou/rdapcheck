# rdapcheck

A simple RDAP library and command line tool to check the availability of a domain name.

[Link to deno.land/x module page](https://deno.land/x/rdapcheck)

## Installation

Run once using:

```bash
$ deno run --allow-net https://deno.land/x/rdapcheck/cmd.ts
```

Compile the client into a portable executable using:

```bash
$ deno compile --allow-net https://deno.land/x/rdapcheck/cmd.ts
```

Install the client using:

```bash
$ deno install --allow-net https://deno.land/x/rdapcheck/cmd.ts
```

## Usage

```
rdapcheck DOMAINS...
```

## Example

```bash
$ rdapcheck aaa.net bbb.org asldkfjal.com johndoe.xyz
aaa.net is not available
bbb.org is not available
asldkfjal.com is available
johndoe.xyz is not available
```

This tool was completed in one afternoon by referring to the following sources:

- [ICANN RDAP overview](https://www.icann.org/rdap)
- [ICANN lookup tool](https://lookup.icann.org/lookup)
- [RFC 7483](https://datatracker.ietf.org/doc/html/rfc7483)
- [ARIN page on Whois and the RDAP protocol](https://www.arin.net/resources/registry/whois/rdap)
- [The IANA RDAP bootstrapping registry](https://data.iana.org/rdap/)
- [RFC 8605](https://www.rfc-editor.org/info/rfc8605)
- [RFC 8977](https://www.rfc-editor.org/info/rfc8977)
- [RFC 9082](https://www.rfc-editor.org/info/rfc9082)
- [RFC 9083](https://www.rfc-editor.org/info/rfc9083)
- [RFC 7484](https://datatracker.ietf.org/doc/html/rfc7484)

For more information on the latest standardization efforts on RDAP, see the [RFC Editor's RDAP page](https://www.rfc-editor.org/search/rfc_search_detail.php?title=RDAP&pubstatus%5B%5D=Any&pub_date_type=any).
