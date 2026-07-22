# Feature Inventory — Radarr (Pass 1 output, awaiting admin review)

> Generated from entry points (33 UI routes, 75 API controllers) at commit: see
> `git -C fixtures/Radarr rev-parse --short HEAD`. In the real product, the admin
> reviews this list — renames, merges, splits, excludes — and the approved version
> becomes `skills/taxonomy.md`, which drives which pages get written.

| # | Feature (proposed page) | User entry points | Key API/code areas |
|---|---|---|---|
| 1 | Movie library (browse & manage) | `/`, `/movie/:titleSlug` | `Movies/MovieController.cs`, `MovieEditorController.cs`, `MovieFiles/` |
| 2 | Adding movies | `/add/new` | `Movies/MovieLookupController.cs`, `MovieController.cs` (POST), `NzbDrone.Core/Movies/AddMovieService.cs` |
| 3 | Importing an existing library | `/add/import` | `Movies/MovieImportController.cs`, `MovieFolderController.cs` |
| 4 | Discovering movies (recommendations) | `/add/discover` | `ImportLists/ImportListMoviesController.cs` |
| 5 | Collections | `/collections` | `Collections/CollectionController.cs` |
| 6 | Calendar & iCal feed | `/calendar` | `Calendar/CalendarController.cs`, `CalendarFeedController.cs` |
| 7 | Activity: history, queue, blocklist | `/activity/*` | `History/`, `Queue/`, `Blocklist/` controllers |
| 8 | Wanted: missing & cutoff-unmet | `/wanted/*` | `Wanted/` controllers |
| 9 | Quality profiles & definitions | `/settings/profiles`, `/settings/quality` | `Profiles/Quality/`, `Qualities/`, `Profiles/Delay/` |
| 10 | Custom formats | `/settings/customformats` | `CustomFormats/CustomFormatController.cs` + `NzbDrone.Core/CustomFormats/` |
| 11 | Media management & file naming | `/settings/mediamanagement` | `Config/MediaManagementConfigController.cs`, `Config/NamingConfigController.cs`, `RootFolders/` |
| 12 | Indexers & release search | `/settings/indexers` | `Indexers/IndexerController.cs`, `ReleaseController.cs` |
| 13 | Download clients | `/settings/downloadclients` | `DownloadClient/DownloadClientController.cs` |
| 14 | Import lists | `/settings/importlists` | `ImportLists/ImportListController.cs`, `ImportListExclusionController.cs` |
| 15 | Notifications (connections) | `/settings/connect` | `Notifications/NotificationController.cs` |
| 16 | Tags & auto-tagging | `/settings/tags` | `Tags/`, `AutoTagging/AutoTaggingController.cs` |
| 17 | System health & maintenance | `/system/*` | `Health/HealthController.cs`, `Commands/`, `Logs/` |

Cross-cutting pages (Pass 3): Product overview · Glossary · Error catalog.

**Demo scope:** feature #2 (Adding movies) is traced first — see `drafts/adding-movies.md`.
