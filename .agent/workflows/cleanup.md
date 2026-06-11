---
description: Archive accumulated phase directories from completed milestones into `.gsd/milestones/v{X.Y}-phases/`. Identifies which phases belong to each completed milestone, shows a dry-run summary, and moves directories on confirmation.

---

<objective>
Archive accumulated phase directories from completed milestones into `.gsd/milestones/v{X.Y}-phases/`. Identifies which phases belong to each completed milestone, shows a dry-run summary, and moves directories on confirmation.
</objective>

<required_reading>

1. `.gsd/MILESTONES.md`
2. `.gsd/milestones/` directory listing
3. `.gsd/phases/` directory listing

</required_reading>

<process>

## 1. Identify Completed Milestones

Read `.gsd/MILESTONES.md` to identify completed milestones and their versions.

```bash
cat .gsd/MILESTONES.md
```

Extract each milestone version (e.g., v1.0, v1.1, v2.0).

Check which milestone archive dirs already exist:

```bash
ls -d .gsd/milestones/v*-phases 2>/dev/null
```

Filter to milestones that do NOT already have a `-phases` archive directory.

If all milestones already have phase archives:

```
All completed milestones already have phase directories archived. Nothing to clean up.
```

Stop here.



## 2. Determine Phase Membership

For each completed milestone without a `-phases` archive, read the archived ROADMAP snapshot to determine which phases belong to it:

```bash
cat .gsd/milestones/v{X.Y}-ROADMAP.md
```

Extract phase numbers and names from the archived roadmap (e.g., Phase 1: Foundation, Phase 2: Auth).

Check which of those phase directories still exist in `.gsd/phases/`:

```bash
ls -d .gsd/phases/*/ 2>/dev/null
```

Match phase directories to milestone membership. Only include directories that still exist in `.gsd/phases/`.



## 3. Show Dry Run

Present a dry-run summary for each milestone:

```
## Cleanup Summary

### v{X.Y} — {Milestone Name}
These phase directories will be archived:
- 01-foundation/
- 02-auth/
- 03-core-features/

Destination: .gsd/milestones/v{X.Y}-phases/

### v{X.Z} — {Milestone Name}
These phase directories will be archived:
- 04-security/
- 05-hardening/

Destination: .gsd/milestones/v{X.Z}-phases/
```

If no phase directories remain to archive (all already moved or deleted):

```
No phase directories found to archive. Phases may have been removed or archived previously.
```

Stop here.

AskUserQuestion: "Proceed with archiving?" with options: "Yes — archive listed phases" | "Cancel"

If "Cancel": Stop.



## 4. Archive Phases

For each milestone, move phase directories:

```bash
mkdir -p .gsd/milestones/v{X.Y}-phases
```

For each phase directory belonging to this milestone:

```bash
mv .gsd/phases/{dir} .gsd/milestones/v{X.Y}-phases/
```

Repeat for all milestones in the cleanup set.



## 5. Commit

Commit the changes:

```bash
node .agent/bin/gsd-tools.cjs commit "chore: archive phase directories from completed milestones" --files .gsd/milestones/ .gsd/phases/
```



## 6. Report

```
Archived:
{For each milestone}
- v{X.Y}: {N} phase directories → .gsd/milestones/v{X.Y}-phases/

.gsd/phases/ cleaned up.
```



</process>

<success_criteria>

- [ ] All completed milestones without existing phase archives identified
- [ ] Phase membership determined from archived ROADMAP snapshots
- [ ] Dry-run summary shown and user confirmed
- [ ] Phase directories moved to `.gsd/milestones/v{X.Y}-phases/`
- [ ] Changes committed

</success_criteria>
