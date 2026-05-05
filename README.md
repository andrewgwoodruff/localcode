<p align="center">
  <img src="assets/logo.png" alt="LocalCode" width="390">
</p>
<p align="center">The open source AI coding agent.</p>
<p align="center">
  <a href="https://github.com/andrewgwoodruff/localcode/actions/workflows/publish.yml"><img alt="Build status" src="https://img.shields.io/github/actions/workflow/status/andrewgwoodruff/localcode/publish.yml?style=flat-square&branch=dev" /></a>
</p>

---

### Installation

```bash
# Build from source
cd packages/opencode && bun run install-local
```

#### Installation Directory

After building, the binary is placed at `~/.localcode/bin/localcode`. Add it to your PATH:

```bash
export PATH="$HOME/.localcode/bin:$PATH"
```

### Agents

LocalCode includes two built-in agents you can switch between with the `Tab` key.

- **build** - Default, full-access agent for development work
- **plan** - Read-only agent for analysis and code exploration
  - Denies file edits by default
  - Asks permission before running bash commands
  - Ideal for exploring unfamiliar codebases or planning changes

Also included is a **general** subagent for complex searches and multistep tasks.
This is used internally and can be invoked using `@general` in messages.

### Contributing

If you're interested in contributing, please read our [contributing docs](./CONTRIBUTING.md) before submitting a pull request.

### FAQ

#### How is this different from Claude Code?

It's very similar to Claude Code in terms of capability. Here are the key differences:

- 100% open source
- Not coupled to any provider. LocalCode can be used with Claude, OpenAI, Google, or even local models. As models evolve, the gaps between them will close and pricing will drop, so being provider-agnostic is important.
- Out-of-the-box LSP support
- A focus on TUI. Built by neovim users and the creators of [terminal.shop](https://terminal.shop); pushing the limits of what's possible in the terminal.
- A client/server architecture. This, for example, can allow LocalCode to run on your computer while you drive it remotely from a mobile app, meaning that the TUI frontend is just one of the possible clients.

---

### Acknowledgments

LocalCode is a fork of [opencode](https://github.com/anomalyco/opencode) by anomalyco.
