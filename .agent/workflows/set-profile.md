---
description: Switch the model profile used by GSD agents. Controls which Claude model each agent uses, balancing quality vs token spend.

---

<objective>
Switch the model profile used by GSD agents. Controls which Claude model each agent uses, balancing quality vs token spend.
</objective>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

## 1. Validate
Validate argument:

```
if $ARGUMENTS.profile not in ["quality", "balanced", "budget"]:
  Error: Invalid profile "$ARGUMENTS.profile"
  Valid profiles: quality, balanced, budget
  EXIT
```


## 2. Ensure And Load Config
Ensure config exists and load current state:

```bash
node .agent/bin/gsd-tools.cjs config-ensure-section
INIT=$(node .agent/bin/gsd-tools.cjs state load)
```

This creates `.gsd/config.json` with defaults if missing and loads current config.


## 3. Update Config
Read current config from state load or directly:

Update `model_profile` field:
```json
{
  "model_profile": "$ARGUMENTS.profile"
}
```

Write updated config back to `.gsd/config.json`.


## 4. Confirm
Display confirmation with model table for selected profile:

```
✓ Model profile set to: $ARGUMENTS.profile

Agents will now use:

[Show table from MODEL_PROFILES in gsd-tools.cjs for selected profile]

Example:
| Agent | Model |
|-------|-------|
| gsd-planner | opus |
| gsd-executor | sonnet |
| gsd-verifier | haiku |
| ... | ... |

Next spawned agents will use the new profile.
```

Map profile names:
- quality: use "quality" column from MODEL_PROFILES
- balanced: use "balanced" column from MODEL_PROFILES
- budget: use "budget" column from MODEL_PROFILES


</process>

<success_criteria>
- [ ] Argument validated
- [ ] Config file ensured
- [ ] Config updated with new model_profile
- [ ] Confirmation displayed with model table
</success_criteria>
