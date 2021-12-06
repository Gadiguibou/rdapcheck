# rdapcheck

A simple library and command-line tool to check domain name availability in bulk using the [RDAP](https://www.icann.org/rdap) protocol, a simple protocol meant to replace WHOIS.

This module is also available on [deno.land/x](https://deno.land/x/rdapcheck).

![Usage screenshot](https://user-images.githubusercontent.com/34945306/144460820-f193dd79-f93e-488c-800f-58a6b540e42a.png)

## Installation

### Using Deno

Run once using:

```bash
$ deno run --allow-net https://deno.land/x/rdapcheck/cmd.ts
```

Compile the client into a portable executable using:

```bash
$ deno compile -o rdapcheck --allow-net https://deno.land/x/rdapcheck/cmd.ts
```

Install the client using:

```bash
$ deno install -n rdapcheck --allow-net https://deno.land/x/rdapcheck/cmd.ts
```

### Manually

Binary executables are available for the latest [release](https://github.com/Gadiguibou/rdapcheck/releases/latest).

## Usage

```
rdapcheck [OPTIONS] DOMAINS...
```

The available options are:

- `-q` or `--quiet`: Only print the names of the domains that are available
- `-p` or `--progress`: Print the number of domains processed so far
- `-c` or `--chunk-size`: The number of domains to process in parallel. Set to 10 by default

`DOMAIN` can be a domain name or a pattern with wildcards that `rdapcheck` will fill in with every possible value.

The available wildcards are:

- `*`: Matches any letter, number or hyphen, "-"
- `?`: Matches any letter
- `#`: Matches any number

## Examples

### Check the availability of a single domain

```bash
$ rdapcheck johndoe.xyz
johndoe.xyz is not available
```

### Check the availability of multiple domains with a single command

```bash
$ rdapcheck aaa.net bbb.org asldkfjal.com johndoe.xyz
aaa.net is not available
bbb.org is not available
asldkfjal.com is available
johndoe.xyz is not available
```

### Only print the names of the domains that are available

```bash
$ rdapcheck -q aaa.net bbb.org asldkfjal.com johndoe.xyz
asldkfjal.com
```

### Check the availability of all domains that match a list of patterns

```bash
$ rdapcheck -q 'ex?mple.com' 'johndoe#.net'
exbmple.com
excmple.com
exdmple.com
exfmple.com
...
exrmple.com
extmple.com
exumple.com
johndoe0.com
johndoe1.com
...
johndoe5.com
johndoe6.com
johndoe8.com
johndoe9.com
```

## Sources

This tool was completed over the course of one afternoon by referring to the following sources:

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
