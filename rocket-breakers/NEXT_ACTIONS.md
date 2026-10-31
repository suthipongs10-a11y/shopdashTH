# Next actions

0. **Blocked on owner:** send ZIP 02 (catalog + asset manifest + BATCH_001 + validator) — M0 catalog
   import and M1 boss/weapon values depend on it. Then ZIP 03–06 concept images into `art/concepts/`.
1. Run `python3 tools/validate_bundle.py` once ZIP 02 is merged; record result.
2. Engine: Godot 4 is not installed in the cloud container. Pin an exact stable Godot 4 version,
   install it headless (or record an alternative in DECISIONS.md with migration cost).
3. Create runnable project and catalog importer; validate all IDs and tables.
4. Implement M0 portrait movement/input and save repository.
5. Implement M1 joint/integrity separation, tow, fitting and W022 source theft (SLICE-01).
6. Use BATCH_001 for ChatGPT production asset requests; keep labeled placeholders until delivered and approved.
7. Playtest salvage with actual players; do not expand all bosses before gate passes.
