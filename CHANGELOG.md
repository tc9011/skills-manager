## [0.10.3](https://github.com/tc9011/skills-manager/compare/v0.10.2...v0.10.3) (2026-03-06)


### Bug Fixes

* push local commits when remote branch has never been pushed to ([9f71dab](https://github.com/tc9011/skills-manager/commit/9f71dab37bfd71de692f6320f2e0d3b38ff7b105))

## [0.10.2](https://github.com/tc9011/skills-manager/compare/v0.10.1...v0.10.2) (2026-03-05)


### Bug Fixes

* gracefully handle missing gh CLI during push repo creation ([bb664e7](https://github.com/tc9011/skills-manager/commit/bb664e768fbbc386ee229f212b03c42b981319a2))

## [0.10.1](https://github.com/tc9011/skills-manager/compare/v0.10.0...v0.10.1) (2026-03-05)


### Bug Fixes

* push unpushed commits when working tree is clean but local is ahead of remote ([4b17fa0](https://github.com/tc9011/skills-manager/commit/4b17fa054780b0e650cb7ae14413f52ca9490894))

# [0.10.0](https://github.com/tc9011/skills-manager/compare/v0.9.1...v0.10.0) (2026-03-05)


### Features

* add `sm` as shorthand binary alias for `skills-manager` ([84e2817](https://github.com/tc9011/skills-manager/commit/84e2817b08d75b7af504d3fd162ff96959f3a6e3))

## [0.9.1](https://github.com/tc9011/skills-manager/compare/v0.9.0...v0.9.1) (2026-03-04)


### Bug Fixes

* add wrapper script to prevent AI from misinterpreting scoped package name ([3ed5148](https://github.com/tc9011/skills-manager/commit/3ed51489eb0ceb25620d9ec73f9eeaf64d79ceda))

# [0.9.0](https://github.com/tc9011/skills-manager/compare/v0.8.0...v0.9.0) (2026-03-04)


### Bug Fixes

* use shell variable for npm scope to prevent @ symbol being parsed as file path ([4fd4395](https://github.com/tc9011/skills-manager/commit/4fd4395c8391648681c591e5c8842119558ea2f9))


### Features

* make auth optional — use getGitHubToken instead of ensureGitHubToken ([dffc860](https://github.com/tc9011/skills-manager/commit/dffc86051f630aa6d438da38389d7c41bc9f124a))

# [0.8.0](https://github.com/tc9011/skills-manager/compare/v0.7.1...v0.8.0) (2026-03-04)


### Features

* support non-interactive link command via --agents, --skills, --mode flags ([4deb733](https://github.com/tc9011/skills-manager/commit/4deb733a0e1d70de1445c614ee4ba3a0dc5e31af))

## [0.7.1](https://github.com/tc9011/skills-manager/compare/v0.7.0...v0.7.1) (2026-03-04)


### Bug Fixes

* fix skill ([e34552c](https://github.com/tc9011/skills-manager/commit/e34552ccf2c5b70f0b70073fff6deb68a491550b))

# [0.7.0](https://github.com/tc9011/skills-manager/compare/v0.6.2...v0.7.0) (2026-03-04)


### Features

* add skills-manager skill for AI agent CLI operation ([87e1aa1](https://github.com/tc9011/skills-manager/commit/87e1aa13260592be506aa599cf2cc3f9616eeee1))

## [0.6.2](https://github.com/tc9011/skills-manager/compare/v0.6.1...v0.6.2) (2026-03-04)


### Bug Fixes

* read CLI version dynamically from package.json ([ce6008e](https://github.com/tc9011/skills-manager/commit/ce6008ef8a579b83939f98552ce0691deb369f1c))
* reclassify Cursor as non-universal agent with .cursor/skills project path ([7187da5](https://github.com/tc9011/skills-manager/commit/7187da59ab3ac2c5da97f9a9f0b4c11f15ec7b80))
* replace all 52 no-explicit-any casts with proper types in test files ([05708c7](https://github.com/tc9011/skills-manager/commit/05708c76a39ec3acf02945663aa008d7f96068e9))
* use $XDG_CONFIG_HOME for amp, kimi-cli, replit, universal, goose, and crush globalPaths ([62dfdc8](https://github.com/tc9011/skills-manager/commit/62dfdc8429c2ab94f96c0f60639173a4d601e581))


### Reverts

* Revert "fix: reclassify Cursor as non-universal agent with .cursor/skills project path" ([d0e2ec9](https://github.com/tc9011/skills-manager/commit/d0e2ec931c2537515d5249fccbd413c3bbf43a93))

## [0.6.1](https://github.com/tc9011/skills-manager/compare/v0.6.0...v0.6.1) (2026-03-04)


### Bug Fixes

* update placeholder text for GitHub repo input in pull prompt ([c6fb7ba](https://github.com/tc9011/skills-manager/commit/c6fb7baeebbf710970fd7ae7abe5f0cc6aca473f))

# [0.6.0](https://github.com/tc9011/skills-manager/compare/v0.5.1...v0.6.0) (2026-03-04)


### Features

* prompt user to resolve conflicts when push is rejected by remote ([8f7b159](https://github.com/tc9011/skills-manager/commit/8f7b1594c72dddbca86b2506fc25f473aa456e66))

## [0.5.1](https://github.com/tc9011/skills-manager/compare/v0.5.0...v0.5.1) (2026-03-03)


### Bug Fixes

* show project path instead of global path in --project agent selection ([7de320a](https://github.com/tc9011/skills-manager/commit/7de320a0871f5b8817b16e928f58027ef28c8b9b))

# [0.5.0](https://github.com/tc9011/skills-manager/compare/v0.4.1...v0.5.0) (2026-03-03)


### Features

* reorder project link prompts to skills → mode → agents and remove default selection ([5c42e8d](https://github.com/tc9011/skills-manager/commit/5c42e8d5678b2ebd3f080aa181204ece35eaed6b))

## [0.4.1](https://github.com/tc9011/skills-manager/compare/v0.4.0...v0.4.1) (2026-03-02)


### Bug Fixes

* fetch remote refs before checkout to handle missing local branches ([2f18f4e](https://github.com/tc9011/skills-manager/commit/2f18f4e5f1f75496478b079529d968ed997a850a))

# [0.4.0](https://github.com/tc9011/skills-manager/compare/v0.3.0...v0.4.0) (2026-03-02)


### Features

* add skill selection prompt for project-level link ([155b378](https://github.com/tc9011/skills-manager/commit/155b3786e65c78d42e3b0477743583e7d6dee3ba))

# [0.3.0](https://github.com/tc9011/skills-manager/compare/v0.2.1...v0.3.0) (2026-03-02)


### Features

* add project-level link with copy/symlink mode ([bcc45a6](https://github.com/tc9011/skills-manager/commit/bcc45a662b5898db5e22055ab796786134e2a969))

## [0.2.1](https://github.com/tc9011/skills-manager/compare/v0.2.0...v0.2.1) (2026-03-02)


### Bug Fixes

* skip link when pull has no changes ([9dc9afb](https://github.com/tc9011/skills-manager/commit/9dc9afb5f87f3bfd27948ac129bcb4b54e76bffd))

# [0.2.0](https://github.com/tc9011/skills-manager/compare/v0.1.1...v0.2.0) (2026-03-02)


### Features

* automate releases with semantic-release ([be28284](https://github.com/tc9011/skills-manager/commit/be28284fab0e551e401ec89c7ce222b73666c972))
