# SmackJeeves Archive Completeness (as of 2026-09-02)

## Source of truth

The entire collection originates from Internet Archive's `smackjeeves-web-comics`
collection (downloaded via the `ia` CLI — see `Commands.txt` in the 1TB Transfer
folder on the network drive). Re-check the current item count anytime with:

```
curl -s "https://archive.org/advancedsearch.php?q=collection%3Asmackjeeves-web-comics&fl%5B%5D=identifier&rows=0&output=json"
```

As of this writing: **34,742 items**.

## Result: the triage database is a complete 1:1 mirror of the archive.org collection

- `archive-entries` collection in Payload: **34,742 docs** (`totalDocs`), matching
  archive.org exactly.
- Status breakdown at time of check: `unsorted` 25,753, `excluded` 7,832,
  `uploaded` 881, `ready-for-review` 174, `ready-for-rating` 102.
- Every `comicId` in the database has corresponding files on the network drive
  (`\\192.168.117.7\Monolith\xypter\...`) — **zero DB entries are missing from
  disk.**

## Network drive folder roles (all under `\\192.168.117.7\Monolith\xypter\`)

| Folder | Contents | Unique comic IDs |
|---|---|---|
| `1TB Transfer (WII GAMES)\smackjeeves\bigfolder` | Sample/preview set: first 1-3 page images per comic (`<id>-<page>.ext`), used for quick triage without needing the full comic downloaded | 21,203 |
| `1TB Transfer (WII GAMES)\smackjeeves` (top level) | Full comic folders (`smackjeeves-<id>/`), partial coverage of the archive | 20,811 |
| `smackjeevesfull` | Full comic folders (`smackjeeves-<id>/`), the other main bulk source | 12,915 |
| `smackjeevesfinished` | Items pulled from the main pool that are cleaned up and ready to move to online | 1,030 |
| `smackjeevesonline` | Finished, ready-to-upload items (final staging before going live) | 1,030 |
| `smackjeeves other` | Misc batch zips, not comic-ID-keyed | — |

Union of unique comic IDs across all of the above: **34,755**.

## Discrepancies to resolve

**12 comic IDs exist on disk but have no `archive-entries` row yet** — worth a
quick manual check (legitimate new finds vs. stray/duplicate folders) and adding
to the DB if valid:

```
7781, 126426, 154690, 162123, 165590, 167450, 169580, 170515,
171296, 179417, 179461, 210726
```

**636 comic IDs have no actual page images**, per the project's own scan
(`comicswithoutpages.txt` in the `1TB Transfer (WII GAMES)\smackjeeves` folder) —
these are counted in the archive.org total and in the DB, but the underlying
archive.org item is empty/broken. These can likely be pre-marked/auto-excluded
in triage rather than manually reviewed one by one, since there's nothing to
review.

## Content policy filtering (planned)

18+ and gay-related content shows up frequently in the raw dataset and doesn't
fit the site's criteria. An automatic pre-filter pass (e.g. keyword/tag matching
on comic titles or descriptions, or flags already present in the archive.org
metadata) is worth building to auto-exclude or auto-flag these before a human
ever has to look at the triage queue — this is the main lever for finishing
faster, since `unsorted` is currently 25,753 entries.

## How this was measured

Via SSH to the TrueNAS box hosting the drive (`root@192.168.117.7`, key at
`~/.ssh/truenas_brazil` on this machine), listing `smackjeeves-<id>` folder names
and `<id>-<page>.ext` filenames directly on the ZFS-backed filesystem
(`/mnt/MonolithPool/MonolithSambaDataset/xypter/...`) rather than over
SMB/VPN — much faster for large directory listings than mapping the drive from
the US. Comic ID lists were extracted per-folder, unioned, and diffed in Node
against a full dump of the `archive-entries` collection (fetched via
`PAYLOAD_API_KEY` since that collection requires authentication to read).
