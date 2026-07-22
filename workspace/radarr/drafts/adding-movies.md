---
title: Adding movies
feature: adding-movies          # inventory #2
state: draft                    # not visible to end users until published
audience: [product, qa, support]
source_commit: c7cf91c
generated: 2026-07-14
revised: 2026-07-14             # rev 2 — lifecycle deepened per skill rule R1
verified: false                 # Pass 4 checker not yet run (manual demo)
# ── fact sheet (hidden from end users; anchors power staleness detection) ──
facts:
  - {id: f1,  category: ui,       claim: "Add New Movie page served at /add/new", anchors: ["frontend/src/App/AppRoutes.tsx:62"]}
  - {id: f2,  category: ui,       claim: "Single search box; placeholder shows title, tmdb: and imdb: query forms; search fires on every keystroke", anchors: ["frontend/src/AddMovie/AddNewMovie/AddNewMovie.js:102-109", "frontend/src/AddMovie/AddNewMovie/AddNewMovie.js:61-71"]}
  - {id: f3,  category: ui,       claim: "Copy inconsistency: empty-state hint mentions only TMDb Id; no-results message mentions TMDb and IMDb", anchors: ["frontend/src/AddMovie/AddNewMovie/AddNewMovie.js:184-187", "src/NzbDrone.Core/Localization/Core/en.json:40"]}
  - {id: f4,  category: ui,       claim: "Add modal fields: root folder, monitor, minimum availability, quality profile, tags, start-search checkbox; no client-side validation before Add", anchors: ["frontend/src/AddMovie/AddNewMovie/AddNewMovieModalContent.js:86-197"]}
  - {id: f5,  category: ui,       claim: "Defaults: monitor=movieOnly, minimumAvailability=released, searchForMovie=true; persisted across sessions", anchors: ["frontend/src/Store/Actions/addMovieActions.js:31-43"]}
  - {id: f6,  category: ui,       claim: "Root folder help text: subfolder created automatically", anchors: ["frontend/src/AddMovie/AddNewMovie/AddNewMovieModalContent.js:101-103", "src/NzbDrone.Core/Localization/Core/en.json:38"]}
  - {id: f7,  category: ui,       claim: "Already-added results show library check icon and link to the movie page instead of the add dialog", anchors: ["frontend/src/AddMovie/AddNewMovie/AddNewMovieSearchResult.js:91", "frontend/src/AddMovie/AddNewMovie/AddNewMovieSearchResult.js:158-165"]}
  - {id: f8,  category: api,      claim: "Lookup = GET /movie/lookup?term=; prefix parsing is server-side", anchors: ["frontend/src/Store/Actions/addMovieActions.js:81-86", "src/Radarr.Api.V3/Movies/MovieLookupController.cs:77-84"]}
  - {id: f9,  category: api,      claim: "Add = POST /movie; returns 201", anchors: ["src/Radarr.Api.V3/Movies/MovieController.cs:240-248"]}
  - {id: f10, category: api,      claim: "Malformed tmdb: slug silently returns zero results; TMDb/IMDb URLs auto-converted to prefix queries", anchors: ["src/NzbDrone.Core/MetadataSource/SkyHook/SkyHookProxy.cs:495-504", "src/NzbDrone.Core/MetadataSource/SkyHook/SkyHookProxy.cs:409-423"]}
  - {id: f11, category: rule,     claim: "Duplicate detection is by TMDB id only, enforced at API POST validation layer", anchors: ["src/Radarr.Api.V3/Movies/MovieController.cs:112-113", "src/NzbDrone.Core/Validation/Paths/MovieExistsValidator.cs:24-26"]}
  - {id: f12, category: rule,     claim: "Title required only when TmdbId <= 0", anchors: ["src/Radarr.Api.V3/Movies/MovieController.cs:112-113"]}
  - {id: f13, category: rule,     claim: "Root folder must be non-empty, valid, configured, and not itself a movie folder", anchors: ["src/Radarr.Api.V3/Movies/MovieController.cs:83-102"]}
  - {id: f14, category: rule,     claim: "Second, path-only validation inside AddMovieService after final path computed; does not re-check TMDB duplicate", anchors: ["src/NzbDrone.Core/Movies/AddMovieService.cs:131-151", "src/NzbDrone.Core/Movies/AddMovieValidator.cs:19-24"]}
  - {id: f15, category: rule,     claim: "Final path = root folder + generated folder name", anchors: ["src/NzbDrone.Core/Movies/AddMovieService.cs:133-141"]}
  - {id: f16, category: failure,  claim: "Duplicate message 'This movie has already been added' is hardcoded, not localized", anchors: ["src/NzbDrone.Core/Validation/Paths/MovieExistsValidator.cs:15"]}
  - {id: f17, category: failure,  claim: "Path-collision messages hardcoded server-side (already configured / ancestor / root folder / does not exist / contains movie folder)", anchors: ["src/NzbDrone.Core/Validation/Paths/MoviePathValidation.cs:18", "src/NzbDrone.Core/Validation/Paths/MovieAncestorValidator.cs:17", "src/NzbDrone.Core/Validation/Paths/RootFolderValidator.cs:17", "src/NzbDrone.Core/Validation/Paths/RootFolderExistsValidator.cs:17", "src/Radarr.Api.V3/Movies/MovieFolderAsRootFolderValidator.cs:18"]}
  - {id: f18, category: failure,  claim: "Unresolvable TMDB id at add time -> 'A movie with this ID was not found. Path: <path>'", anchors: ["src/NzbDrone.Core/Movies/AddMovieService.cs:116-124"]}
  - {id: f19, category: failure,  claim: "Localized search failure/empty strings: FailedLoadingSearchResults, CouldNotFindResults, HaveNotAddedMovies", anchors: ["src/NzbDrone.Core/Localization/Core/en.json:660", "src/NzbDrone.Core/Localization/Core/en.json:257", "src/NzbDrone.Core/Localization/Core/en.json:743"]}
  - {id: f20, category: post-add, claim: "Movie monitored unless Monitor=none; addOptions carry monitor+searchForMovie", anchors: ["frontend/src/Utilities/Movie/getNewMovie.ts:22-32"]}
  - {id: f21, category: post-add, claim: "Add queues a refresh; automatic release search only if searchForMovie, runs exactly once", anchors: ["src/NzbDrone.Core/Movies/MovieAddedHandler.cs:19-22", "src/NzbDrone.Core/Movies/MovieScannedHandler.cs:42-56"]}
  - {id: f22, category: post-add, claim: "Movie exists in DB immediately with no file; search/import async", anchors: ["src/NzbDrone.Core/Movies/MovieService.cs:94-101"]}
  - {id: f23, category: test,     claim: "Tests: add without title works (backfilled), path=root+folder, validation failures throw", anchors: ["src/NzbDrone.Core.Test/MovieTests/AddMovieFixture.cs:53-131"]}
  - {id: f24, category: test,     claim: "Coverage gap: TMDB-duplicate and path-collision logic not exercised by AddMovieFixture", anchors: ["src/NzbDrone.Core.Test/MovieTests/AddMovieFixture.cs:42-51"]}
  - {id: f25, category: refresh,  claim: "Refresh fetches fresh TMDb metadata (title, overview, images, runtime, ratings, release dates) and stamps LastInfoSync", anchors: ["src/NzbDrone.Core/Movies/RefreshMovieService.cs:83-132"]}
  - {id: f26, category: refresh,  claim: "New movies always get a forced disk rescan on refresh, regardless of rescan settings — existing files picked up immediately", anchors: ["src/NzbDrone.Core/Movies/RefreshMovieService.cs:176-207", "src/NzbDrone.Core/Movies/RefreshMovieService.cs:239-241"]}
  - {id: f27, category: refresh,  claim: "Movie removed from TMDb -> status Deleted + error log; not auto-removed from library", anchors: ["src/NzbDrone.Core/Movies/RefreshMovieService.cs:87-97", "src/NzbDrone.Core/Movies/RefreshMovieService.cs:243-245"]}
  - {id: f28, category: availability, claim: "Available = min availability vs dates: Announced always; InCinemas from cinema date; Released from earliest physical/digital, or cinema+90d fallback", anchors: ["src/NzbDrone.Core/Movies/Movie.cs:77-119"]}
  - {id: f29, category: availability, claim: "Post-add auto search silently skipped when movie unmonitored or not yet available — no user-facing message", anchors: ["src/NzbDrone.Core/IndexerSearch/MoviesSearchService.cs:40-48"]}
  - {id: f30, category: search,   claim: "Auto search uses only indexers with Automatic Search enabled and matching tags; LastSearchTime updated even on empty result", anchors: ["src/NzbDrone.Core/IndexerSearch/ReleaseSearchService.cs:98-125"]}
  - {id: f31, category: search,   claim: "No acceptable release found -> log only; no notification; movie stays missing", anchors: ["src/NzbDrone.Core/IndexerSearch/MoviesSearchService.cs:91-116"]}
  - {id: f32, category: search,   claim: "Grab sends release to download client, publishes grab event (history + OnGrab notifications)", anchors: ["src/NzbDrone.Core/Download/DownloadService.cs:130-141"]}
  - {id: f33, category: failure,  claim: "Grab with no download client for protocol -> '{protocol} Download client isn't configured yet'", anchors: ["src/NzbDrone.Core/Download/DownloadService.cs:72-75"]}
  - {id: f34, category: search,   claim: "Download client unavailable at grab -> release parked as pending and retried; not lost", anchors: ["src/NzbDrone.Core/Download/ProcessDownloadDecisions.cs:96-110", "src/NzbDrone.Core/Download/ProcessDownloadDecisions.cs:211-224"]}
  - {id: f35, category: import,   claim: "Tracked download states: Downloading -> ImportPending -> Importing -> Imported (+ ImportBlocked/FailedPending/Failed)", anchors: ["src/NzbDrone.Core/Download/TrackedDownloads/TrackedDownload.cs:49-59"]}
  - {id: f36, category: import,   claim: "Import waits until download client reports Completed", anchors: ["src/NzbDrone.Core/Download/CompletedDownloadService.cs:60-73"]}
  - {id: f37, category: import,   claim: "Title mismatch blocks auto-import: 'Movie title mismatch, automatic import is not possible. Manual Import required.'", anchors: ["src/NzbDrone.Core/Download/CompletedDownloadService.cs:98-104"]}
  - {id: f38, category: import,   claim: "Successful import -> state Imported + DownloadCompletedEvent", anchors: ["src/NzbDrone.Core/Download/CompletedDownloadService.cs:194-205"]}
  - {id: f39, category: import,   claim: "Import moves/renames file per naming config, removes upgraded old files, records MovieFile, fires import event (history + notifications)", anchors: ["src/NzbDrone.Core/MediaFiles/MovieImport/ImportApprovedMovie.cs:131-174"]}
  - {id: f40, category: failure,  claim: "Import failure strings: 'Failed to import movie, Root folder missing.' / 'Destination already exists.' / 'unable to move existing file to the Recycle Bin.' / generic", anchors: ["src/NzbDrone.Core/MediaFiles/MovieImport/ImportApprovedMovie.cs:176-201"]}
  - {id: f41, category: failure,  claim: "Inaccessible path/permissions import failure logged with explicit permissions guidance message", anchors: ["src/NzbDrone.Core/MediaFiles/DownloadedMovieImportService.cs:396-405"]}
  - {id: f42, category: import,   claim: "Completed Download Handling (auto-import) is ON by default", anchors: ["src/NzbDrone.Core/Configuration/ConfigService.cs:158-162"]}
  - {id: f43, category: visibility, claim: "Queue statuses: 'Downloaded - Unable to Import Automatically' (warning) / 'Waiting to Import' / 'Importing' / 'Waiting to Process'", anchors: ["frontend/src/Activity/Queue/QueueStatus.tsx:77-100", "src/NzbDrone.Core/Localization/Core/en.json:1965"]}
  - {id: f44, category: visibility, claim: "Queue failure strings: 'Download failed' and 'Import failed: {sourceTitle}'", anchors: ["frontend/src/Activity/Queue/QueueStatus.tsx:117-141", "src/NzbDrone.Core/Localization/Core/en.json:570", "src/NzbDrone.Core/Localization/Core/en.json:787"]}
  - {id: f45, category: visibility, claim: "History records Grabbed, DownloadFolderImported, DownloadFailed event types", anchors: ["src/NzbDrone.Core/History/HistoryService.cs:35-39", "src/NzbDrone.Core/History/History.cs:36-49"]}
  - {id: f46, category: visibility, claim: "Monitored+fileless movies appear in Wanted->Missing; default filter is Monitored", anchors: ["frontend/src/Store/Actions/wantedActions.js:80-100"]}
  - {id: f47, category: failure,  claim: "Health warning: 'No indexers available with Automatic Search enabled, {appName} will not provide any automatic search results'", anchors: ["src/NzbDrone.Core/HealthCheck/Checks/IndexerSearchCheck.cs:24-28", "src/NzbDrone.Core/Localization/Core/en.json:901"]}
  - {id: f48, category: failure,  claim: "Health warning: 'No download client is available'", anchors: ["src/NzbDrone.Core/HealthCheck/Checks/DownloadClientCheck.cs:31-33", "src/NzbDrone.Core/Localization/Core/en.json:423"]}
  - {id: f49, category: schedule, claim: "No scheduled missing/cutoff search task exists; automatic pickup of new releases rides RSS Sync, default every 30 min (min 10)", anchors: ["src/NzbDrone.Core/Jobs/TaskManager.cs:64-134", "src/NzbDrone.Core/Configuration/ConfigService.cs:106-110"]}
  - {id: f50, category: schedule, claim: "Library-wide refresh (metadata + availability re-evaluation) runs every 24h", anchors: ["src/NzbDrone.Core/Jobs/TaskManager.cs:86-90"]}
  - {id: f51, category: notification, claim: "'On Movie Added' notifications fire immediately at add, before search/download", anchors: ["src/NzbDrone.Core/Notifications/NotificationService.cs:170-188"]}
  - {id: f52, category: notification, claim: "'On Grab' at grab; 'On Import' only for new downloads (not for upgrades/pre-existing without NewDownload)", anchors: ["src/NzbDrone.Core/Notifications/NotificationService.cs:96-168"]}
  - {id: f53, category: notification, claim: "Blocked import publishes manual-interaction-required event once -> user prompted to intervene", anchors: ["src/NzbDrone.Core/Download/CompletedDownloadService.cs:249-263", "src/NzbDrone.Core/Notifications/NotificationService.cs:255-305"]}
---

# Adding movies

You add movies one at a time from the **Add New Movie** page (*Movies → Add New*).
For importing an existing collection of movie files, see *Importing an existing
library* instead.

## Searching for a movie

Type into the single search box. Three kinds of search work: [f2]

- **By title** — e.g. `The Dark Knight`. Results update as you type.
- **By exact ID** — `tmdb:155` or `imdb:tt0468569` for a precise match.
- **By pasted link** — a themoviedb.org or imdb.com movie URL is recognized and
  converted to an ID search automatically. [f10]

Things support should know about search behavior:

- A mistyped ID search (e.g. `tmdb:15x5`) shows **no results rather than an error** —
  users who report "the movie isn't found" may simply have a typo in the ID. [f10]
- If the search service is unavailable, the user sees *"Failed to load search results,
  please try again."* [f19]
- No matches shows *"Couldn't find any results for '{term}'"*. [f19]
- A movie **already in the library** appears in results with a check-mark ("Already in
  your library"); clicking it opens that movie's page instead of the add dialog — users
  cannot add it twice from search. [f7]

## Adding a movie

Selecting a result opens the add dialog. Before adding, the user chooses: [f4]

| Setting | What it means | Default |
|---|---|---|
| Root folder | Where the movie's folder will live — *"'{folder}' subfolder will be created automatically"* [f6][f15] | last used |
| Monitor | Whether Radarr should track this movie for downloads | Movie Only [f5] |
| Minimum availability | How early Radarr may consider the movie obtainable (Announced / In Cinemas / Released) | Released [f5] |
| Quality profile | Which file qualities are acceptable | last used |
| Tags | Optional labels used by other features | none |
| Start search for missing movie | Search for a downloadable release immediately after adding | enabled [f5] |

Choices are remembered for the next add. [f5] Nothing is checked until the user presses
**Add Movie** — all validation happens at that moment, on the server. [f4]

## When adding fails

The exact messages users may report at the moment of adding, and what each means:

| Message (verbatim) | Cause | What to do |
|---|---|---|
| *"This movie has already been added"* | The same movie (same TMDb entry) is already in the library — even if its title looks different. [f11][f16] | Find it in the library; check its settings instead of re-adding |
| *"Path '…' is already configured for an existing movie"* | Another movie already uses that folder [f17] | Pick a different root folder or resolve the clash |
| *"Path '…' is an ancestor of an existing movie"* | The chosen folder contains an existing movie's folder inside it [f17] | Choose a more specific folder |
| *"Path '…' is already configured as a root folder"* | The movie's folder can't be a root folder itself [f17] | Choose a root folder; the subfolder is created automatically |
| *"Root folder '…' does not exist"* | The configured root folder is missing on disk (unmounted drive, renamed share) [f17] | Restore or reconfigure the root folder |
| *"A movie with this ID was not found. Path: …"* | The movie was removed from TMDb between searching and adding — rare [f18] | Re-search; if persistent, the TMDb entry is gone |

> Note for international deployments: these failure messages are shown **in English
> regardless of the user's language setting** — only search-page texts are translated.
> Support may see English error text quoted by non-English users. [f16][f17]

## What happens after you press Add — the full lifecycle

### Stage 1 — The movie appears (instant)

The movie is in the library **immediately, with no file** — details and artwork are
placeholder-thin for a moment. [f22] It is monitored unless Monitor was set to
*None*. [f20] If any notification connection has **On Movie Added** enabled, that
notification fires right now — before any searching or downloading. [f51]

### Stage 2 — Details refresh and disk check (seconds)

Radarr immediately fetches the movie's full details from TMDb — title, overview,
artwork, runtime, ratings, and the release dates that drive availability — [f25] and
**always checks the movie's folder on disk**, even if the "rescan after refresh"
setting is off for normal refreshes. If a matching file already exists there, it is
picked up right away without any download. [f26]

Edge case: if the movie was deleted from TMDb, it stays in the library but its status
becomes *Deleted*; nothing is removed automatically. [f27]

### Stage 3 — Automatic search (only if eligible — this surprises people)

The *start search for missing movie* option does **not** guarantee a search. The
automatic search runs only if the movie is **monitored AND already "available"**: [f29]

- Availability comes from *minimum availability* vs the movie's release dates:
  **Announced** = always available; **In Cinemas** = from the cinema release date;
  **Released** (the default) = from the earliest physical/digital release date — and if
  those dates are unknown, from 90 days after the cinema date. [f28]
- **If the movie isn't available yet, the search is skipped silently** — no message,
  no error. This is the #1 "I added it but nothing happened" support case. The movie
  simply waits (see Stage 3b). [f29]
- The search asks only indexers that have *Automatic Search* enabled (and whose tags
  match the movie). With none configured, a system health warning shows: *"No indexers
  available with Automatic Search enabled, {appName} will not provide any automatic
  search results"*. [f30][f47]
- If the search finds **no acceptable release**, the user is not notified — the movie
  just stays *Missing*. [f31]
- The add-time search runs **exactly once**; it is not retried as such. [f21]

### Stage 3b — What retries, and how often

There is **no scheduled "search for missing movies" task**. After a skipped or empty
add-time search, new releases are picked up by the **RSS sync** cycle — every
**30 minutes by default** (configurable, minimum 10) — or by a manual search on the
movie's page. [f49] Movie details and the availability state are also re-evaluated by
the **daily** (24 h) library refresh, so a movie that *becomes* available starts being
considered without user action — but via RSS matching, not a dedicated search. [f50][f28]

### Stage 4 — Grab and download (watch in Activity → Queue)

When an acceptable release is found it is **grabbed**: sent to the download client,
recorded in History as *Grabbed*, and **On Grab** notifications fire. [f32][f45][f52]

Failure paths at this stage:

- No download client set up for the release type: *"{protocol} Download client isn't
  configured yet"*, plus the standing health warning *"No download client is
  available"*. [f33][f48]
- Download client temporarily unreachable: the grabbed release is **not lost** — it is
  parked as *pending* and retried when the client comes back. [f34]
- A download that fails shows *"Download failed"* in the Queue and is recorded in
  History. [f44][f45]

### Stage 5 — Import into the library (automatic, on by default)

Once the download client reports the download **complete**, Radarr imports it —
automatically, unless Completed Download Handling was turned off. [f36][f42] Import
moves and renames the file into the movie's folder according to the file-naming
settings, replaces any older file it upgrades, and records the file against the
movie. [f39] History records the import, and **On Import** notifications fire (for new
downloads — not for upgrades of pre-existing files). [f45][f52]

While this happens the Queue shows the item's exact stage: *"Downloaded - Waiting to
Process"*, *"Downloaded - Waiting to Import"*, *"Downloaded - Importing"* — or, with a
warning icon, *"Downloaded - Unable to Import Automatically"*. [f43]

Failure paths at this stage (verbatim strings support will see):

| Message | Cause |
|---|---|
| *"Movie title mismatch, automatic import is not possible. Manual Import required."* | The downloaded item's name couldn't be confidently matched to the movie; the user is prompted to intervene (a manual-interaction notification fires once) [f37][f53] |
| *"Failed to import movie, Root folder missing."* | The library disk/share is unavailable at import time [f40] |
| *"Failed to import movie, Destination already exists."* | A file with the target name is already in place [f40] |
| *"Failed to import movie, unable to move existing file to the Recycle Bin."* | Upgrading, but the old file couldn't be recycled (often permissions) [f40] |
| *"Import failed: {title}"* | Shown in the Queue for any import error [f44] |

Permissions problems produce an explicit log message telling the user to check that the
path exists and that the account running Radarr can access it. [f41]

### Where to check progress at any moment

| Screen | What it tells you |
|---|---|
| The movie's own page | Current status and whether a file exists |
| **Activity → Queue** | Live download + import stages, including the exact statuses and warnings above [f43][f44] |
| **Activity → History** | The permanent record: *Grabbed*, *Imported*, *Download Failed* events [f45] |
| **Wanted → Missing** | Monitored movies that still have no file — a just-added movie sits here until import; note the list hides unmonitored movies by default [f46] |
| **System → Health** | Standing configuration problems (no indexers, no download client) [f47][f48] |

## For QA

- **Duplicate detection is by TMDb ID only.** Same film under a different title = still
  a duplicate; different TMDb entries (e.g. separate editions) = not duplicates. [f11]
- **There is no client-side validation** — every failure case is a server response, so
  test them through the add action, not the form. [f4]
- Title is not required when a valid TMDb ID is supplied; it's backfilled from TMDb. [f12][f23]
- Malformed `tmdb:`/`imdb:` searches yield empty results, not errors. [f10]
- **Availability gating**: add with *minimum availability = Released* and an unreleased
  movie → the add-time search must be silently skipped; add with *Announced* → it must
  run. Boundary: unknown physical/digital dates fall back to cinema date + 90 days. [f28][f29]
- **Retry semantics**: no scheduled missing-search exists — verify pickup happens via
  RSS sync (default 30 min) and via manual search only. [f49]
- A file already on disk in the movie's folder is picked up during the add-time refresh
  even with rescan-after-refresh disabled. [f26]
- The add-time automatic search fires exactly once, after the background refresh. [f21]
- **On Import** notifications must NOT fire for quality upgrades of pre-existing files. [f52]
- **Possible copy bug**: the empty-page hint mentions only TMDb ID search, while the
  no-results message mentions both TMDb and IMDb — inconsistent guidance. [f3]
- **Known automated-test gap** (from the code's own test suite): duplicate detection
  and folder-collision rules are *not* covered by the add-movie tests — worth priority
  in manual regression. [f24]
