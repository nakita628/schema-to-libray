<!--
Title format: `type(scope): summary`, imperative mood, no trailing period.

  type   feat | fix | perf | refactor | docs | test | build | ci | chore
  scope  zod | valibot | effect | typebox | arktype | ajv | cli | parser | fixtures | docs | ci

The title is the changelog: GitHub builds each release's notes from the titles of the
pull requests merged since the previous release. Write it for the person reading
`v0.3.7` on the releases page, not for the diff.

  fix(valibot): emit valid schemas for null and object enum members
  feat(zod): support x-stringbool on boolean properties
-->

## What

<!-- One or two sentences: what changed, from the point of view of someone using the package. -->

## Why

<!-- The bug, the missing capability, or the issue this closes (`Closes #123`). -->

## Generated output

<!--
The review artifact for this repository is the fixture diff. Either paste the interesting
part of the `fixtures/*/*/output.ts` diff, or state that generated output is unchanged.
-->

## Checklist

- [ ] `vp run -r check` — format, lint, types
- [ ] `vp run lint` — Markdown, terminology, spelling, secrets, links
- [ ] `vp test` and `vp run schema-to-library#test`
- [ ] Fixtures regenerated and their diff reviewed, if a generator changed
- [ ] `vp run -r typecheck` — generated code still compiles against the real target libraries
- [ ] A regression test that fails without this change
- [ ] README updated, if installation, the commands or the example changed (it is
      deliberately minimal — nothing else belongs in it)
- [ ] `packages/schema-to-library` version bumped **only** if this pull request should publish to npm on merge
